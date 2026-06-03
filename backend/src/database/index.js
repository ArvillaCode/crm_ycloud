const db = require('../config/db');

async function checkConnection() {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('[Database] Connection verified. Current time from PG:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('[Database] Connection failed verification:', error.message);
    return false;
  }
}

module.exports = {
  checkConnection,
};
