const db = require('../config/db');

class ContactRepository {
  async findById(id, orgId) {
    const query = `
      SELECT c.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', l.id, 'name', l.name, 'color', l.color)
               ) FILTER (WHERE l.id IS NOT NULL), 
               '[]'
             ) as tags
      FROM contacts c
      LEFT JOIN contact_labels cl ON c.id = cl.contact_id
      LEFT JOIN labels l ON cl.label_id = l.id
      WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
      GROUP BY c.id
    `;
    const result = await db.query(query, [id, orgId]);
    return result.rows[0] || null;
  }

  async findByPhone(phone, orgId) {
    const query = `
      SELECT c.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', l.id, 'name', l.name, 'color', l.color)
               ) FILTER (WHERE l.id IS NOT NULL), 
               '[]'
             ) as tags
      FROM contacts c
      LEFT JOIN contact_labels cl ON c.id = cl.contact_id
      LEFT JOIN labels l ON cl.label_id = l.id
      WHERE c.phone = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
      GROUP BY c.id
    `;
    const result = await db.query(query, [phone, orgId]);
    return result.rows[0] || null;
  }

  async create({ organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId, tagIds = [] }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO contacts (organization_id, name, phone, email, company, notes, pipeline_stage_id, assigned_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId];
      const result = await client.query(query, values);
      const newContact = result.rows[0];

      if (tagIds && tagIds.length > 0) {
        // Multi-org safety check
        const tagCheck = await client.query(
          'SELECT id FROM labels WHERE id = ANY($1) AND organization_id = $2',
          [tagIds, organizationId]
        );
        
        if (tagCheck.rowCount !== tagIds.length) {
          throw new Error('Una o más etiquetas no pertenecen a tu organización.');
        }

        for (const tagId of tagIds) {
          await client.query(
            'INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2)',
            [newContact.id, tagId]
          );
        }
      }

      await client.query('COMMIT');
      return this.findById(newContact.id, organizationId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id, orgId, fields, tagIds) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

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

      if (setClause.length > 0) {
        values.push(id, orgId);
        const query = `
          UPDATE contacts
          SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1} AND deleted_at IS NULL
          RETURNING *
        `;
        await client.query(query, values);
      }

      if (tagIds !== undefined) {
        // Delete all old tags belonging to this organization's context
        await client.query(`
          DELETE FROM contact_labels 
          WHERE contact_id = $1 
          AND label_id IN (
            SELECT id FROM labels WHERE organization_id = $2
          )
        `, [id, orgId]);

        if (tagIds && tagIds.length > 0) {
          // Multi-org safety check
          const tagCheck = await client.query(
            'SELECT id FROM labels WHERE id = ANY($1) AND organization_id = $2',
            [tagIds, orgId]
          );
          
          if (tagCheck.rowCount !== tagIds.length) {
            throw new Error('Una o más etiquetas no pertenecen a tu organización.');
          }

          for (const tagId of tagIds) {
            await client.query(
              'INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2)',
              [id, tagId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return this.findById(id, orgId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(orgId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT c.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', l.id, 'name', l.name, 'color', l.color)
               ) FILTER (WHERE l.id IS NOT NULL), 
               '[]'
             ) as tags
      FROM contacts c
      LEFT JOIN contact_labels cl ON c.id = cl.contact_id
      LEFT JOIN labels l ON cl.label_id = l.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC 
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
