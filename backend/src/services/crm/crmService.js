const contactRepository = require('../../repositories/contactRepository');

class CrmService {
  /**
   * Move a contact to a different pipeline stage
   * @param {string} contactId
   * @param {string} orgId
   * @param {string} targetStageId
   */
  async transitionContactStage(contactId, orgId, targetStageId) {
    console.log(`[CRM] Transitioning contact ${contactId} to stage ${targetStageId}`);
    return await contactRepository.update(contactId, orgId, {
      pipeline_stage_id: targetStageId,
    });
  }

  /**
   * Assign a contact to an agent user
   * @param {string} contactId
   * @param {string} orgId
   * @param {string} userId
   */
  async assignContactAgent(contactId, orgId, userId) {
    console.log(`[CRM] Assigning contact ${contactId} to agent ${userId}`);
    return await contactRepository.update(contactId, orgId, {
      assigned_user_id: userId,
    });
  }
}

module.exports = new CrmService();
