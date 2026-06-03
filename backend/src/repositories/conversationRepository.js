const db = require('../config/db');

class ConversationRepository {
  async findById(id, orgId) {
    const query = 'SELECT * FROM conversations WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL';
    const result = await db.query(query, [id, orgId]);
    return result.rows[0] || null;
  }

  async findByContactId(contactId, orgId) {
    const query = 'SELECT * FROM conversations WHERE contact_id = $1 AND organization_id = $2 AND deleted_at IS NULL';
    const result = await db.query(query, [contactId, orgId]);
    return result.rows[0] || null;
  }

  async create({ organizationId, contactId, status = 'open' }) {
    const query = `
      INSERT INTO conversations (organization_id, contact_id, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [organizationId, contactId, status]);
    return result.rows[0];
  }

  async updateStatus(id, orgId, status) {
    const query = `
      UPDATE conversations
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [status, id, orgId]);
    return result.rows[0];
  }

  async incrementUnreadCount(id, orgId) {
    const query = `
      UPDATE conversations
      SET unread_count = unread_count + 1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [id, orgId]);
    return result.rows[0];
  }

  async clearUnreadCount(id, orgId) {
    const query = `
      UPDATE conversations
      SET unread_count = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [id, orgId]);
    return result.rows[0];
  }

  async list(orgId, { status = 'open', limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT c.*, con.name as contact_name, con.phone as contact_phone
      FROM conversations c
      JOIN contacts con ON c.contact_id = con.id
      WHERE c.organization_id = $1 
        AND c.status = $2 
        AND c.deleted_at IS NULL 
        AND con.deleted_at IS NULL
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $3 OFFSET $4
    `;
    const result = await db.query(query, [orgId, status, limit, offset]);
    return result.rows;
  }
}

module.exports = new ConversationRepository();
