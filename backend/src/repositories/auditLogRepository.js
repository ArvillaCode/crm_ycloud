const db = require('../config/db');

class AuditLogRepository {
  async log({ organizationId, userId, action, metadata, ipAddress, entityType, entityId, oldValues, newValues }) {
    const query = `
      INSERT INTO audit_logs (
        organization_id, user_id, action, metadata, ip_address, 
        entity_type, entity_id, old_values, new_values
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb)
      RETURNING *
    `;
    const result = await db.query(query, [
      organizationId,
      userId,
      action,
      JSON.stringify(metadata || {}),
      ipAddress || null,
      entityType || null,
      entityId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    ]);
    return result.rows[0];
  }

  async logUpdate({ organizationId, userId, action, ipAddress, entityType, entityId, oldEntity, newEntity, metadata = {} }) {
    const oldValues = {};
    const newValues = {};

    if (oldEntity && newEntity) {
      const keys = new Set([...Object.keys(oldEntity), ...Object.keys(newEntity)]);
      for (const key of keys) {
        if (['updated_at', 'created_at', 'deleted_at'].includes(key)) continue;

        const oldVal = oldEntity[key];
        const newVal = newEntity[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          if (oldVal !== undefined) oldValues[key] = oldVal;
          if (newVal !== undefined) newValues[key] = newVal;
        }
      }
    }

    return this.log({
      organizationId,
      userId,
      action,
      metadata,
      ipAddress,
      entityType,
      entityId,
      oldValues: Object.keys(oldValues).length > 0 ? oldValues : null,
      newValues: Object.keys(newValues).length > 0 ? newValues : null,
    });
  }

  async list(orgId, { limit = 100, offset = 0 } = {}) {
    const query = `
      SELECT a.*, u.name as user_name 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [orgId, limit, offset]);
    return result.rows;
  }
}

module.exports = new AuditLogRepository();
