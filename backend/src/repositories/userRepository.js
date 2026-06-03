const db = require('../config/db');

class UserRepository {
  async findById(id) {
    const query = 'SELECT id, organization_id, name, email, role, created_at, updated_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email, orgId) {
    const query = 'SELECT * FROM users WHERE email = $1 AND organization_id = $2';
    const result = await db.query(query, [email, orgId]);
    return result.rows[0] || null;
  }

  async create({ organizationId, name, email, passwordHash, role }) {
    const query = `
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, organization_id, name, email, role, created_at, updated_at
    `;
    const values = [organizationId, name, email, passwordHash, role || 'agent'];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async listByOrganization(orgId) {
    const query = 'SELECT id, name, email, role, created_at FROM users WHERE organization_id = $1 ORDER BY name ASC';
    const result = await db.query(query, [orgId]);
    return result.rows;
  }
}

module.exports = new UserRepository();
