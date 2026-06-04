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
      const { name, phone, email, company, notes, pipelineStageId, assignedUserId, tagIds } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone number are required' });
      }

      // Sanitize phone number (strip whitespace)
      const cleanPhone = phone.replace(/\s+/g, '');

      // Check duplicate phone per org
      const existing = await contactRepository.findByPhone(cleanPhone, orgId);
      if (existing) {
        return res.status(400).json({ error: 'El teléfono del contacto ya existe en esta organización.' });
      }

      // Normalize empty strings to null to avoid UUID formatting exceptions in PostgreSQL
      const cleanPipelineStageId = pipelineStageId === '' || pipelineStageId === undefined ? null : pipelineStageId;
      const cleanAssignedUserId = assignedUserId === '' || assignedUserId === undefined ? null : assignedUserId;

      const newContact = await contactRepository.create({
        organizationId: orgId,
        name,
        phone: cleanPhone,
        email: email === '' ? null : email,
        company: company === '' ? null : company,
        notes: notes === '' ? null : notes,
        pipelineStageId: cleanPipelineStageId,
        assignedUserId: cleanAssignedUserId || userId,
        tagIds: tagIds || []
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
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El teléfono del contacto ya existe en esta organización.' });
      }
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Formato de identificador UUID no válido.' });
      }
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { id } = req.params;
      const fields = req.body;
      const { tagIds } = req.body;

      const oldContact = await contactRepository.findById(id, orgId);
      if (!oldContact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Map camelCase fields to snake_case and normalize empty strings to null
      const mappedFields = {};
      const fieldMappings = {
        name: 'name',
        phone: 'phone',
        email: 'email',
        company: 'company',
        notes: 'notes',
        pipelineStageId: 'pipeline_stage_id',
        pipeline_stage_id: 'pipeline_stage_id',
        assignedUserId: 'assigned_user_id',
        assigned_user_id: 'assigned_user_id',
        lastMessageAt: 'last_message_at',
        last_message_at: 'last_message_at'
      };

      for (const [key, val] of Object.entries(fields)) {
        if (fieldMappings[key]) {
          const dbField = fieldMappings[key];
          // Strip spaces from phone
          if (dbField === 'phone' && typeof val === 'string') {
            mappedFields[dbField] = val.replace(/\s+/g, '');
          } else if (val === '') {
            mappedFields[dbField] = null;
          } else {
            mappedFields[dbField] = val;
          }
        }
      }

      const updated = await contactRepository.update(id, orgId, mappedFields, tagIds);
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
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El teléfono del contacto ya existe en esta organización.' });
      }
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Formato de identificador UUID no válido.' });
      }
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
