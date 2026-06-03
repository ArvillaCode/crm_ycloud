const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../config/logger');

async function runMigrations() {
  logger.info('[Migration Runner] Connecting to database...');
  
  try {
    // 1. Create schema_migrations table if not exists to track history
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in alphabetical order (001, 002, 003...)
      
    logger.info(`[Migration Runner] Found ${files.length} migration files in folder.`);

    // 3. Query migrations already executed
    const executedRes = await db.query('SELECT name FROM schema_migrations');
    const executed = new Set(executedRes.rows.map(r => r.name));

    // 4. Run pending migrations
    for (const file of files) {
      if (executed.has(file)) {
        logger.info(`[Migration Runner] Migration "${file}" already executed. Skipping.`);
        continue;
      }

      logger.info(`[Migration Runner] Executing migration "${file}"...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Execute SQL content
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the entire SQL script
        await client.query(sqlContent);
        
        // Record migration execution
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        
        await client.query('COMMIT');
        logger.info(`[Migration] Migration "${file}" completed successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`[Migration] Failed migration "${file}". Rolled back changes.`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    logger.info('[Migration Runner] All migrations executed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('[Migration Runner] Migration run failed:', error);
    process.exit(1);
  }
}

runMigrations();
