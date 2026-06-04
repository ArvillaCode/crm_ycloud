const db = require('../config/db');

class TagRepository {
  async findById(id, orgId) {
    const query = 'SELECT * FROM labels WHERE id = $1 AND organization_id = $2';
    const result = await db.query(query, [id, orgId]);
    return result.rows[0] || null;
  }

  async findByName(name, orgId) {
    const query = 'SELECT * FROM labels WHERE name = $1 AND organization_id = $2';
    const result = await db.query(query, [name, orgId]);
    return result.rows[0] || null;
  }

  async list(orgId) {
    const query = 'SELECT * FROM labels WHERE organization_id = $1 ORDER BY name ASC';
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  async create({ organizationId, name, color }) {
    const query = `
      INSERT INTO labels (organization_id, name, color)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [organizationId, name, color || '#E2E8F0']);
    return result.rows[0];
  }

  async update(id, orgId, { name, color }) {
    const query = `
      UPDATE labels
      SET name = $1, color = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND organization_id = $4
      RETURNING *
    `;
    const result = await db.query(query, [name, color, id, orgId]);
    return result.rows[0] || null;
  }

  async delete(id, orgId) {
    const query = 'DELETE FROM labels WHERE id = $1 AND organization_id = $2';
    const result = await db.query(query, [id, orgId]);
    return result.rowCount > 0;
  }

  async findByContactId(contactId, orgId) {
    const query = `
      SELECT l.* FROM labels l
      INNER JOIN contact_labels cl ON l.id = cl.label_id
      INNER JOIN contacts c ON cl.contact_id = c.id
      WHERE cl.contact_id = $1 AND c.organization_id = $2
      ORDER BY l.name ASC
    `;
    const result = await db.query(query, [contactId, orgId]);
    return result.rows;
  }

  async assignToContact(contactId, tagId, orgId) {
    // Verify tag belongs to org
    const tag = await this.findById(tagId, orgId);
    if (!tag) throw new Error('Tag not found in this organization');

    const query = `
      INSERT INTO contact_labels (contact_id, label_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await db.query(query, [contactId, tagId]);
    return true;
  }

  async unassignFromContact(contactId, tagId, orgId) {
    const query = `
      DELETE FROM contact_labels 
      WHERE contact_id = $1 AND label_id = $2
      AND EXISTS (
        SELECT 1 FROM labels l 
        WHERE l.id = $2 AND l.organization_id = $3
      )
    `;
    const result = await db.query(query, [contactId, tagId, orgId]);
    return result.rowCount > 0;
  }
}

module.exports = new TagRepository();
