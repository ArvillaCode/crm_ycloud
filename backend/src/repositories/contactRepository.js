const db = require('../config/db');

class ContactRepository {
  async findById(id, orgId) {
    const query = 'SELECT * FROM contacts WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL';
    const result = await db.query(query, [id, orgId]);
    return result.rows[0] || null;
  }

  async findByPhone(phone, orgId) {
    const query = 'SELECT * FROM contacts WHERE phone = $1 AND organization_id = $2 AND deleted_at IS NULL';
    const result = await db.query(query, [phone, orgId]);
    return result.rows[0] || null;
  }

  async create({ organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId }) {
    const query = `
      INSERT INTO contacts (organization_id, name, phone, email, company, notes, pipeline_stage_id, assigned_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id, orgId, fields) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Fields to filter
    const allowedFields = ['name', 'phone', 'email', 'company', 'notes', 'pipeline_stage_id', 'assigned_user_id', 'last_message_at'];
    
    for (const [key, val] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    values.push(id, orgId);
    const query = `
      UPDATE contacts
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async list(orgId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT * FROM contacts 
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [orgId, limit, offset]);
    return result.rows;
  }

  /**
   * Cascading soft delete: contact -> conversations -> messages
   */
  async softDelete(id, orgId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Soft delete contact
      const contactRes = await client.query(`
        UPDATE contacts 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING id
      `, [id, orgId]);

      if (contactRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      // 2. Soft delete conversations of the contact
      await client.query(`
        UPDATE conversations 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE contact_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `, [id, orgId]);

      // 3. Soft delete messages in those conversations
      await client.query(`
        UPDATE messages 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE conversation_id IN (
          SELECT id FROM conversations WHERE contact_id = $1 AND organization_id = $2
        ) AND deleted_at IS NULL
      `, [id, orgId]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ContactRepository();
