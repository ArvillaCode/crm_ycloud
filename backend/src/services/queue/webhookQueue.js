const { Queue, Worker } = require('bullmq');
const redisClient = require('../../config/redis');
const db = require('../../config/db');
const socketInstance = require('../../utils/socket');
const storageService = require('../storage/storageService');
const logger = require('../../config/logger');
const Sentry = require('../../config/sentry');

const WEBHOOK_QUEUE_NAME = 'whatsapp-webhooks';

// Queue instance
const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisClient,
});

/**
 * Add a webhook payload to the processing queue
 */
async function addWebhookJob(jobId, data) {
  await webhookQueue.add('process-webhook', data, {
    jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
  logger.info(`[Queue] Added webhook job to Redis`, { jobId });
}

// Queue Worker
const webhookWorker = new Worker(
  WEBHOOK_QUEUE_NAME,
  async (job) => {
    logger.info(`[Worker] Started processing webhook job`, { jobId: job.id });
    const payload = job.data;

    // 1. Extract values resiliently
    let phone = '';
    let name = 'Nuevo Lead';
    let body = '';
    let waMsgId = '';
    let msgType = 'text';
    let recipientPhoneId = '';
    let mediaObj = null; // Holds media metadata if present

    if (payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const val = payload.entry[0].changes[0].value;
      const msg = val.messages[0];
      phone = `+${msg.from.replace(/\D/g, '')}`;
      waMsgId = msg.id;
      msgType = msg.type || 'text';
      
      if (msg.type === 'text') {
        body = msg.text?.body || '';
      } else {
        body = `[Archivo: ${msg.type}]`;
        mediaObj = msg[msg.type]; // Image/audio/document metadata contains media id
      }
      name = val.contacts?.[0]?.profile?.name || phone;
      recipientPhoneId = val.metadata?.phone_number_id || '';
    } else if (payload.message) {
      const msg = payload.message;
      phone = msg.from.startsWith('+') ? msg.from : `+${msg.from.replace(/\D/g, '')}`;
      waMsgId = msg.id;
      msgType = msg.type || 'text';
      
      if (msg.type === 'text') {
        body = msg.text?.body || '';
      } else {
        body = `[Archivo: ${msg.type}]`;
        mediaObj = msg[msg.type];
      }
      name = phone;
    } else if (payload.body) {
      phone = payload.phone ? `+${payload.phone.replace(/\D/g, '')}` : '';
      waMsgId = payload.id || `wa_mock_${Date.now()}`;
      body = payload.body || '';
      msgType = payload.type || 'text';
      name = payload.name || phone;
      if (payload.media) {
        mediaObj = payload.media; // Mock media object
      }
    }

    if (!phone || !waMsgId) {
      logger.warn('[Worker] Ignored webhook payload: Missing phone or message ID');
      return { success: false, reason: 'Invalid payload elements' };
    }

    // 2. IDEMPOTENCY CHECK
    // Check if message whatsapp_message_id is already in DB before modifying any state
    const dupRes = await db.query('SELECT id, conversation_id FROM messages WHERE whatsapp_message_id = $1', [waMsgId]);
    if (dupRes.rowCount > 0) {
      logger.warn('[Worker] Ignoring duplicate webhook message event (idempotency check passed)', { whatsappMessageId: waMsgId });
      return { success: true, reason: 'Duplicate event ignored' };
    }

    // 3. Resolve organization
    let orgId = null;
    if (recipientPhoneId) {
      const accRes = await db.query('SELECT organization_id FROM whatsapp_accounts WHERE phone_number_id = $1', [recipientPhoneId]);
      if (accRes.rowCount > 0) {
        orgId = accRes.rows[0].organization_id;
      }
    }
    
    if (!orgId) {
      const orgRes = await db.query('SELECT id FROM organizations LIMIT 1');
      if (orgRes.rowCount > 0) {
        orgId = orgRes.rows[0].id;
      }
    }

    if (!orgId) {
      throw new Error('No organizations found in database to process incoming webhooks.');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 4. Find or Create Contact (checking deleted_at IS NULL)
      let contactId = null;
      const contactRes = await client.query('SELECT id FROM contacts WHERE phone = $1 AND organization_id = $2 AND deleted_at IS NULL', [phone, orgId]);
      
      if (contactRes.rowCount > 0) {
        contactId = contactRes.rows[0].id;
      } else {
        const stageRes = await client.query(`
          SELECT ps.id FROM pipeline_stages ps
          JOIN pipelines p ON ps.pipeline_id = p.id
          WHERE p.organization_id = $1
          ORDER BY p.created_at ASC, ps.order_index ASC
          LIMIT 1
        `, [orgId]);
        
        const defaultStageId = stageRes.rowCount > 0 ? stageRes.rows[0].id : null;

        const newContactRes = await client.query(`
          INSERT INTO contacts (organization_id, name, phone, pipeline_stage_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [orgId, name, phone, defaultStageId]);
        contactId = newContactRes.rows[0].id;
      }

      // 5. Find or Create Conversation
      let convId = null;
      const convRes = await client.query('SELECT id FROM conversations WHERE contact_id = $1 AND organization_id = $2 AND deleted_at IS NULL', [contactId, orgId]);

      if (convRes.rowCount > 0) {
        convId = convRes.rows[0].id;
        await client.query(`
          UPDATE conversations 
          SET unread_count = unread_count + 1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [convId]);
      } else {
        const newConvRes = await client.query(`
          INSERT INTO conversations (organization_id, contact_id, status, unread_count, last_message_at)
          VALUES ($1, $2, 'open', 1, CURRENT_TIMESTAMP)
          RETURNING id
        `, [orgId, contactId]);
        convId = newConvRes.rows[0].id;
      }

      // Update contact activity timestamp
      await client.query('UPDATE contacts SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1', [contactId]);

      // 6. Store Message
      const insertMsgRes = await client.query(`
        INSERT INTO messages (conversation_id, whatsapp_message_id, direction, message_type, content, status)
        VALUES ($1, $2, 'incoming', $3, $4::jsonb, 'delivered')
        RETURNING *
      `, [convId, waMsgId, msgType, JSON.stringify({ body })]);
      const storedMessage = insertMsgRes.rows[0];

      // 7. Handle Multimedia Attachments
      if (mediaObj && ['image', 'audio', 'video', 'document'].includes(msgType)) {
        logger.info('[Worker] Downloading media attachment binary from webhook event', { msgType });
        
        let mediaBuffer = null;
        let mimeType = 'application/octet-stream';
        let filename = `attachment.${msgType === 'document' ? 'pdf' : msgType === 'audio' ? 'ogg' : 'jpg'}`;

        const settingsRepository = require('../../repositories/settingsRepository');
        const apiKeyObj = await settingsRepository.get(orgId, 'ycloud_api_key');

        if (apiKeyObj && apiKeyObj.apiKey && mediaObj.id) {
          // If real API key is configured, download file via YCloud / Meta servers
          try {
            const url = `https://api.ycloud.com/v2/whatsapp/media/${mediaObj.id}`;
            const response = await fetch(url, {
              headers: { 'X-API-Key': apiKeyObj.apiKey }
            });
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              mediaBuffer = Buffer.from(arrayBuffer);
              mimeType = response.headers.get('content-type') || mimeType;
              filename = mediaObj.filename || filename;
            }
          } catch (fetchErr) {
            logger.error('[Worker] Failed to download media from API', fetchErr);
          }
        }

        // Mock attachment generation fallback for dev testing
        if (!mediaBuffer) {
          logger.info('[Worker] Using mock binary buffer for attachment');
          mediaBuffer = Buffer.from('MOCK_BINARY_DATA_REPRESENTATION');
          mimeType = msgType === 'image' ? 'image/jpeg' : msgType === 'audio' ? 'audio/ogg' : 'application/pdf';
        }

        // Upload using storageService
        const mediaUrl = await storageService.upload(mediaBuffer, filename, mimeType);

        // Store attachment in message_attachments table
        await client.query(`
          INSERT INTO message_attachments (message_id, media_type, media_url, mime_type, filename)
          VALUES ($1, $2, $3, $4, $5)
        `, [storedMessage.id, msgType, mediaUrl, mimeType, filename]);
      }

      await client.query('COMMIT');

      // 8. Broadcast Event via Socket.io
      const io = socketInstance.get();
      if (io) {
        io.to(orgId).emit('new_message', {
          conversationId: convId,
          message: storedMessage,
        });
        logger.info(`[Worker] Broadcasted incoming message to Socket.io room`, { orgId });
      }

      return { success: true, conversationId: convId, messageId: storedMessage.id };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('[Worker] Database transaction error processing webhook', err);
      throw err;
    } finally {
      client.release();
    }
  },
  {
    connection: redisClient,
    concurrency: 5,
  }
);

webhookWorker.on('failed', (job, err) => {
  const attemptsMade = job ? job.attemptsMade : 0;
  const maxAttempts = job && job.opts ? job.opts.attempts : 1;
  const isFinalFailure = attemptsMade >= maxAttempts;
  
  logger.error(`[Worker] Job ${job?.id} failed (${attemptsMade}/${maxAttempts}):`, err);

  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setExtra('jobId', job?.id);
      scope.setExtra('jobData', job?.data);
      scope.setExtra('attemptsMade', attemptsMade);
      scope.setExtra('maxAttempts', maxAttempts);
      scope.setExtra('isFinalFailure', isFinalFailure);
      Sentry.captureException(err);
    });
  }
});

module.exports = {
  webhookQueue,
  addWebhookJob,
};
