const db = require('../config/db');

class MessageRepository {
  async create({ conversationId, whatsappMessageId, direction, messageType, content, status = 'sent' }) {
    const query = `
      INSERT INTO messages (conversation_id, whatsapp_message_id, direction, message_type, content, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [conversationId, whatsappMessageId, direction, messageType, JSON.stringify(content), status];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async updateStatusByWhatsappId(whatsappMessageId, status) {
    const query = `
      UPDATE messages
      SET status = $1
      WHERE whatsapp_message_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [status, whatsappMessageId]);
    return result.rows[0] || null;
  }

  async listByConversation(conversationId, { limit = 100, offset = 0 } = {}) {
    const query = `
      SELECT * FROM messages
      WHERE conversation_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [conversationId, limit, offset]);
    return result.rows;
  }
}

module.exports = new MessageRepository();
