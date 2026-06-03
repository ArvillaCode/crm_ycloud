class AiService {
  /**
   * Process a message and return an AI/chatbot response if keywords match or AI is enabled
   * @param {string} organizationId - Organization context
   * @param {string} messageContent - Input message from client
   * @returns {Promise<string|null>} - Response text or null if no automation triggers
   */
  async generateResponse(organizationId, messageContent) {
    const text = messageContent.toLowerCase().trim();

    // Sample keyword trigger logic
    if (text === 'hola' || text === 'hello') {
      return '¡Hola! Bienvenido a nuestro canal de soporte. ¿En qué podemos ayudarte hoy?';
    }

    if (text === 'precios' || text === 'planes') {
      return 'Nuestros planes comienzan desde $29 USD al mes. ¿Te gustaría recibir más información o agendar una llamada con un asesor?';
    }

    // Default: no automated response (goes to agent)
    return null;
  }
}

module.exports = new AiService();
