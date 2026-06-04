require('dotenv').config();
const settingsRepository = require('../../repositories/settingsRepository');

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return 'N/A';
  if (phone.length <= 6) return '******';
  return `${phone.substring(0, 4)}******${phone.substring(phone.length - 2)}`;
}

function formatTextLog(text) {
  if (!text || typeof text !== 'string') return 'Empty';
  return `[Length: ${text.length} chars]`;
}

class WhatsappService {
  constructor() {
    this.apiKey = process.env.YCLOUD_API_KEY;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  /**
   * Resolve credentials for a specific organization or fallback to env vars
   */
  async getCredentials(orgId) {
    let apiKey = this.apiKey;
    let phoneNumberId = this.phoneNumberId;

    if (orgId) {
      const apiKeySetting = await settingsRepository.get(orgId, 'ycloud_api_key');
      const phoneIdSetting = await settingsRepository.get(orgId, 'whatsapp_phone_id');
      
      if (apiKeySetting && apiKeySetting.apiKey) {
        apiKey = apiKeySetting.apiKey;
      }
      if (phoneIdSetting && phoneIdSetting.phoneId) {
        phoneNumberId = phoneIdSetting.phoneId;
      }
    }

    return { apiKey, phoneNumberId };
  }

  /**
   * Send a text message to a contact
   * @param {string} to - Destination phone number in E.164 format
   * @param {string} text - Message body text
   * @param {string} [orgId] - Optional organization ID for setting lookup
   */
  async sendTextMessage(to, text, orgId = null) {
    const { apiKey, phoneNumberId } = await this.getCredentials(orgId);
    const isEnabled = process.env.YCLOUD_ENABLED === 'true' && process.env.WHATSAPP_SEND_ENABLED === 'true';
    const maskedTo = maskPhone(to);
    const textLog = formatTextLog(text);

    if (!isEnabled || !apiKey) {
      console.log(`[WhatsApp Mock] Simulated text message to ${maskedTo} ${textLog} [Safety Mock Mode: ${!isEnabled}]`);
      return {
        success: true,
        messageId: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      };
    }

    console.log(`[WhatsApp YCloud] Sending text message to ${maskedTo}`);
    try {
      const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: phoneNumberId,
          to: to,
          type: 'text',
          text: {
            body: text
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[WhatsApp YCloud API Error]', response.status, errorData);
        throw new Error(errorData.message || `YCloud API responded with status ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        messageId: responseData.id || `wamid.ycloud_${Date.now()}`
      };
    } catch (error) {
      console.error('[WhatsApp YCloud Service Error]', error);
      throw error;
    }
  }

  /**
   * Send a template message
   * @param {string} to - Destination phone number
   * @param {string} templateName - Template identifier
   * @param {string} languageCode - Language code, e.g. 'es' or 'en'
   * @param {Array} components - Template parameters
   * @param {string} [orgId] - Optional organization ID
   */
  async sendTemplateMessage(to, templateName, languageCode = 'es', components = [], orgId = null) {
    const { apiKey, phoneNumberId } = await this.getCredentials(orgId);
    const isEnabled = process.env.YCLOUD_ENABLED === 'true' && process.env.WHATSAPP_SEND_ENABLED === 'true';
    const maskedTo = maskPhone(to);

    if (!isEnabled || !apiKey) {
      console.log(`[WhatsApp Mock] Simulated template ${templateName} (${languageCode}) message to ${maskedTo} [Safety Mock Mode: ${!isEnabled}]`);
      return {
        success: true,
        messageId: `wamid.mock_tpl_${Date.now()}`,
      };
    }

    console.log(`[WhatsApp YCloud] Sending template ${templateName} message to ${maskedTo}`);
    try {
      const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: phoneNumberId,
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[WhatsApp YCloud API Error]', response.status, errorData);
        throw new Error(errorData.message || `YCloud API responded with status ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        messageId: responseData.id || `wamid.ycloud_tpl_${Date.now()}`
      };
    } catch (error) {
      console.error('[WhatsApp YCloud Service Error]', error);
      throw error;
    }
  }

  /**
   * Process an incoming webhook payload
   * @param {Object} payload - The webhook body received from Meta/YCloud
   */
  async handleWebhook(payload) {
    const event = payload?.event || 'unknown';
    const messageId = payload?.message?.id || 'N/A';
    const from = payload?.message?.from;
    const maskedFrom = from ? maskPhone(from) : 'N/A';
    const textLength = payload?.message?.text?.body ? payload?.message?.text?.body.length : 0;
    
    console.log(`[WhatsApp Webhook] Received payload: event=${event}, messageId=${messageId}, from=${maskedFrom}, textLength=${textLength}`);
    return {
      processed: true,
    };
  }
}

module.exports = new WhatsappService();
