const contactRepository = require('../repositories/contactRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

class ContactController {
  async list(req, res) {
    try {
      const orgId = req.user.organizationId;
      const limit = parseInt(req.query.limit || '50');
      const offset = parseInt(req.query.offset || '0');
      
      const contacts = await contactRepository.list(orgId, { limit, offset });
      return res.json(contacts);
    } catch (error) {
      console.error('[ContactController] list error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async get(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;

      const contact = await contactRepository.findById(id, orgId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      return res.json(contact);
    } catch (error) {
      console.error('[ContactController] get error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { name, phone, email, company, notes, pipelineStageId, assignedUserId } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone number are required' });
      }

      // Check duplicate phone per org
      const existing = await contactRepository.findByPhone(phone, orgId);
      if (existing) {
        return res.status(400).json({ error: 'Contact phone number already exists in this organization' });
      }

      const newContact = await contactRepository.create({
        organizationId: orgId,
        name,
        phone,
        email,
        company,
        notes,
        pipelineStageId,
        assignedUserId: assignedUserId || userId,
      });

      // Audit Log
      await auditLogRepository.log({
        organizationId: orgId,
        userId,
        action: 'CONTACT_CREATE',
        metadata: { contactId: newContact.id, name: newContact.name },
        ipAddress: req.ip,
      });

      return res.status(201).json(newContact);
    } catch (error) {
      console.error('[ContactController] create error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { id } = req.params;
      const fields = req.body;

      const oldContact = await contactRepository.findById(id, orgId);
      if (!oldContact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const updated = await contactRepository.update(id, orgId, fields);
      if (!updated) {
        return res.status(400).json({ error: 'No valid fields provided or update failed' });
      }

      // Check if pipeline stage changed
      const isTransition = oldContact.pipeline_stage_id !== updated.pipeline_stage_id;

      // Audit Log
      await auditLogRepository.logUpdate({
        organizationId: orgId,
        userId,
        action: isTransition ? 'CONTACT_PIPELINE_TRANSITION' : 'CONTACT_UPDATE',
        ipAddress: req.ip,
        entityType: 'contacts',
        entityId: id,
        oldEntity: oldContact,
        newEntity: updated,
        metadata: { contactId: id, name: updated.name, isTransition }
      });

      return res.json(updated);
    } catch (error) {
      console.error('[ContactController] update error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async delete(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { id } = req.params;

      const success = await contactRepository.softDelete(id, orgId);

      if (!success) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Audit Log
      await auditLogRepository.log({
        organizationId: orgId,
        userId,
        action: 'CONTACT_SOFT_DELETE',
        metadata: { contactId: id },
        ipAddress: req.ip,
      });

      return res.json({ message: 'Contact soft deleted successfully' });
    } catch (error) {
      console.error('[ContactController] delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ContactController();
