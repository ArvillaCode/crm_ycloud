const db = require('../config/db');
const crypto = require('../utils/crypto');

function isSensitiveKey(key) {
  const k = key.toLowerCase();
  return k.includes('key') || k.includes('token') || k.includes('secret') || k.includes('password');
}

class SettingsRepository {
  async get(orgId, key) {
    const query = 'SELECT * FROM settings WHERE organization_id = $1 AND key = $2';
    const result = await db.query(query, [orgId, key]);
    const row = result.rows[0];
    if (!row) return null;

    let val = row.value;
    if (val && typeof val === 'object' && val._encrypted === true) {
      try {
        const decryptedStr = crypto.decrypt(val.data);
        val = JSON.parse(decryptedStr);
      } catch (err) {
        console.error(`[SettingsRepository] Failed to decrypt/parse setting for key: ${key}`, err);
      }
    }
    return val;
  }

  async list(orgId) {
    const query = 'SELECT key, value FROM settings WHERE organization_id = $1';
    const result = await db.query(query, [orgId]);
    return result.rows.reduce((acc, curr) => {
      let val = curr.value;
      if (val && typeof val === 'object' && val._encrypted === true) {
        try {
          const decryptedStr = crypto.decrypt(val.data);
          val = JSON.parse(decryptedStr);
        } catch (err) {
          console.error(`[SettingsRepository] Failed to decrypt/parse setting in list for key: ${curr.key}`, err);
        }
      }
      acc[curr.key] = val;
      return acc;
    }, {});
  }

  async set(orgId, key, value) {
    let valueToStore = value;
    if (isSensitiveKey(key) && value !== null && value !== undefined) {
      const encryptedData = crypto.encrypt(JSON.stringify(value));
      valueToStore = { _encrypted: true, data: encryptedData };
    }

    const query = `
      INSERT INTO settings (organization_id, key, value)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (organization_id, key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [orgId, key, JSON.stringify(valueToStore)]);
    const savedRow = result.rows[0];
    
    if (savedRow && savedRow.value && typeof savedRow.value === 'object' && savedRow.value._encrypted === true) {
      try {
        const decryptedStr = crypto.decrypt(savedRow.value.data);
        savedRow.value = JSON.parse(decryptedStr);
      } catch (err) {
        console.error(`[SettingsRepository] Failed to decrypt/parse saved setting for key: ${key}`, err);
      }
    }
    return savedRow;
  }
}

module.exports = new SettingsRepository();
