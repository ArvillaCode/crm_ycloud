const db = require('../config/db');
const crypto = require('../utils/crypto');

class WhatsappAccountRepository {
  async findByPhoneNumberId(phoneId) {
    const query = 'SELECT * FROM whatsapp_accounts WHERE phone_number_id = $1';
    const result = await db.query(query, [phoneId]);
    const row = result.rows[0];
    if (row && row.access_token) {
      row.access_token = crypto.decrypt(row.access_token);
    }
    return row || null;
  }

  async findByOrganization(orgId) {
    const query = 'SELECT * FROM whatsapp_accounts WHERE organization_id = $1';
    const result = await db.query(query, [orgId]);
    const row = result.rows[0];
    if (row && row.access_token) {
      row.access_token = crypto.decrypt(row.access_token);
    }
    return row || null;
  }

  async createOrUpdate({ organizationId, phoneNumberId, wabaId, displayPhoneNumber, accessToken }) {
    const encryptedToken = crypto.encrypt(accessToken);
    const query = `
      INSERT INTO whatsapp_accounts (organization_id, phone_number_id, waba_id, display_phone_number, access_token)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (organization_id, phone_number_id)
      DO UPDATE SET 
        waba_id = EXCLUDED.waba_id,
        display_phone_number = EXCLUDED.display_phone_number,
        access_token = EXCLUDED.access_token,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [organizationId, phoneNumberId, wabaId, displayPhoneNumber, encryptedToken];
    const result = await db.query(query, values);
    const row = result.rows[0];
    if (row && row.access_token) {
      row.access_token = crypto.decrypt(row.access_token);
    }
    return row;
  }
}

module.exports = new WhatsappAccountRepository();
