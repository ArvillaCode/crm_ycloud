const db = require('../config/db');

class RefreshTokenRepository {
  async create({ userId, tokenHash, expiresAt }) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
  }

  async findByHash(tokenHash) {
    const query = 'SELECT * FROM refresh_tokens WHERE token_hash = $1';
    const result = await db.query(query, [tokenHash]);
    return result.rows[0] || null;
  }

  async revoke(tokenHash) {
    const query = 'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 RETURNING *';
    const result = await db.query(query, [tokenHash]);
    return result.rows[0] || null;
  }

  async revokeAllForUser(userId) {
    const query = 'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1';
    await db.query(query, [userId]);
  }
}

module.exports = new RefreshTokenRepository();
