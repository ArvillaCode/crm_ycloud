const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

class ConversationController {
  async list(req, res) {
    try {
      const orgId = req.user.organizationId;
      const status = req.query.status || 'open'; // open, pending, closed
      const limit = parseInt(req.query.limit || '50');
      const offset = parseInt(req.query.offset || '0');

      const conversations = await conversationRepository.list(orgId, { status, limit, offset });
      return res.json(conversations);
    } catch (error) {
      console.error('[ConversationController] list error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async get(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;

      const conversation = await conversationRepository.findById(id, orgId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.json(conversation);
    } catch (error) {
      console.error('[ConversationController] get error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateStatus(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['open', 'pending', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be open, pending, or closed' });
      }

      const updated = await conversationRepository.updateStatus(id, orgId, status);
      if (!updated) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Log audit
      await auditLogRepository.log({
        organizationId: orgId,
        userId,
        action: 'CONVERSATION_STATUS_CHANGE',
        metadata: { conversationId: id, status },
        ipAddress: req.ip,
      });

      return res.json(updated);
    } catch (error) {
      console.error('[ConversationController] updateStatus error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessages(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const limit = parseInt(req.query.limit || '100');
      const offset = parseInt(req.query.offset || '0');

      // Check if conversation belongs to organization
      const conversation = await conversationRepository.findById(id, orgId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Clear unread count on reading conversation
      await conversationRepository.clearUnreadCount(id, orgId);

      const messages = await messageRepository.listByConversation(id, { limit, offset });
      return res.json(messages);
    } catch (error) {
      console.error('[ConversationController] getMessages error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ConversationController();
