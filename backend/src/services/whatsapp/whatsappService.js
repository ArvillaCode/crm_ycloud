require('dotenv').config();

class WhatsappService {
  constructor() {
    this.apiKey = process.env.YCLOUD_API_KEY;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  /**
   * Send a text message to a contact
   * @param {string} to - Destination phone number in E.164 format
   * @param {string} text - Message body text
   */
  async sendTextMessage(to, text) {
    console.log(`[WhatsApp] Sending text to ${to}: "${text}"`);
    // Placeholder for YCloud or Meta Cloud API HTTP request
    return {
      success: true,
      messageId: `wamid.mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Send a template message
   * @param {string} to - Destination phone number
   * @param {string} templateName - Template identifier
   * @param {string} languageCode - Language code, e.g. 'es' or 'en'
   * @param {Array} components - Template parameters
   */
  async sendTemplateMessage(to, templateName, languageCode = 'es', components = []) {
    console.log(`[WhatsApp] Sending template ${templateName} (${languageCode}) to ${to}`);
    return {
      success: true,
      messageId: `wamid.mock_tpl_${Date.now()}`,
    };
  }

  /**
   * Process an incoming webhook payload
   * @param {Object} payload - The webhook body received from Meta/YCloud
   */
  async handleWebhook(payload) {
    console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload, null, 2));
    // Returns structured data to trigger services/queues
    return {
      processed: true,
    };
  }
}

module.exports = new WhatsappService();
