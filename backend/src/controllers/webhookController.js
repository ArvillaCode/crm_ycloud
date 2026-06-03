const { addWebhookJob } = require('../services/queue/webhookQueue');

class WebhookController {
  /**
   * GET verification endpoint for Meta / YCloud webhook registration
   */
  async verify(req, res) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'my_verification_token';
    
    // Parse challenge parameters from Meta
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[Webhook Verification] Success!');
        return res.status(200).send(challenge);
      } else {
        console.warn('[Webhook Verification] Failed. Tokens mismatch.');
        return res.sendStatus(403);
      }
    }

    // Default verify token check for other providers
    return res.status(200).json({ status: 'Webhook endpoint active' });
  }

  /**
   * POST handler for receiving webhook payloads (messages, status updates)
   */
  async receive(req, res) {
    try {
      const payload = req.body;
      
      // Determine unique job ID (use WhatsApp message ID if available, or generate one)
      let jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Handle Meta structure or YCloud structure
      if (payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id) {
        jobId = payload.entry[0].changes[0].value.messages[0].id;
      } else if (payload.message?.id) {
        jobId = payload.message.id;
      } else if (payload.id) {
        jobId = payload.id;
      }

      // Add to BullMQ queue for async processing
      await addWebhookJob(jobId, payload);

      // Return a quick 200 OK as required by webhook APIs
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[WebhookController] Error receiving webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new WebhookController();
