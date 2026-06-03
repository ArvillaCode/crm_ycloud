const messageRepository = require('../repositories/messageRepository');
const conversationRepository = require('../repositories/conversationRepository');
const whatsappService = require('../services/whatsapp/whatsappService');
const auditLogRepository = require('../repositories/auditLogRepository');

class MessageController {
  async send(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const { body, messageType = 'text' } = req.body;

      if (!body) {
        return res.status(400).json({ error: 'Message body is required' });
      }

      // 1. Verify conversation belongs to organization
      const conversation = await conversationRepository.findById(conversationId, orgId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // 2. Fetch contact phone number
      const db = require('../config/db');
      const contactQuery = 'SELECT phone FROM contacts WHERE id = $1';
      const contactRes = await db.query(contactQuery, [conversation.contact_id]);
      if (contactRes.rowCount === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      const contactPhone = contactRes.rows[0].phone;

      // 3. Call WhatsApp Service
      const sendResult = await whatsappService.sendTextMessage(contactPhone, body);
      
      // 4. Store Message in DB
      const messageContent = { body };
      const newMessage = await messageRepository.create({
        conversationId,
        whatsappMessageId: sendResult.messageId,
        direction: 'outgoing',
        messageType,
        content: messageContent,
        status: sendResult.success ? 'sent' : 'failed',
      });

      // 5. Update Conversation preview and last message timestamp
      await db.query(`
        UPDATE conversations 
        SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [conversationId]);

      // 6. Broadcast via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(orgId).emit('new_message', {
          conversationId,
          message: newMessage,
        });
      }

      // 7. Audit Log
      await auditLogRepository.log({
        organizationId: orgId,
        userId,
        action: 'MESSAGE_SEND',
        metadata: { conversationId, messageId: newMessage.id },
        ipAddress: req.ip,
      });

      return res.status(201).json(newMessage);
    } catch (error) {
      console.error('[MessageController] send error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new MessageController();
