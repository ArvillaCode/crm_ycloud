const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Resolve root env configuration if running independently
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storageService = require('../src/services/storage/storageService');
const logger = require('../src/config/logger');

async function runBackup() {
  logger.info('[Backup] Starting database backup process...');

  const pgHost = process.env.DB_HOST || 'localhost';
  const pgPort = process.env.DB_PORT || '5432';
  const pgUser = process.env.DB_USER || 'postgres';
  const pgDb = process.env.DB_NAME || 'crm_ycloud';
  const pgPassword = process.env.DB_PASSWORD || '';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `db_backup_${pgDb}_${timestamp}.dump`;
  const backupPath = path.join(__dirname, backupFilename);

  // Use custom compression format (-F c) for compact native dump files
  const cmd = `pg_dump -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -F c -f "${backupPath}"`;

  const env = { ...process.env, PGPASSWORD: pgPassword };

  exec(cmd, { env }, async (error, stdout, stderr) => {
    if (error) {
      logger.error('[Backup] pg_dump utility failed to execute. Ensure pg_dump is installed and reachable.', error);
      logger.error(`[Backup] stderr output: ${stderr}`);
      process.exit(1);
    }

    logger.info(`[Backup] Database dump completed successfully: ${backupFilename}. Uploading to storage...`);

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found at expected path: ${backupPath}`);
      }

      const fileBuffer = fs.readFileSync(backupPath);
      
      // Upload using storage service
      const fileUrl = await storageService.upload(fileBuffer, backupFilename, 'application/octet-stream');
      
      logger.info(`[Backup] Database backup uploaded successfully. Target URL: ${fileUrl}`);

      // Delete local temporary file
      fs.unlinkSync(backupPath);
      logger.info('[Backup] Temporary local backup file removed.');
      process.exit(0);
    } catch (uploadErr) {
      logger.error('[Backup] Failed to read, upload, or clean up backup file:', uploadErr);
      if (fs.existsSync(backupPath)) {
        try {
          fs.unlinkSync(backupPath);
        } catch (cleanupErr) {
          logger.error('[Backup] Failed to delete temporary backup file:', cleanupErr);
        }
      }
      process.exit(1);
    }
  });
}

runBackup();
