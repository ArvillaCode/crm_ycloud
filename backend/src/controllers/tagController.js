const tagRepository = require('../repositories/tagRepository');
const contactRepository = require('../repositories/contactRepository');

class TagController {
  async list(req, res) {
    try {
      const orgId = req.user.organizationId;
      const tags = await tagRepository.list(orgId);
      return res.json(tags);
    } catch (error) {
      console.error('[TagController] list error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'El nombre de la etiqueta es requerido.' });
      }

      // Check duplicates
      const existing = await tagRepository.findByName(name, orgId);
      if (existing) {
        return res.status(400).json({ error: 'Ya existe una etiqueta con este nombre.' });
      }

      const newTag = await tagRepository.create({
        organizationId: orgId,
        name,
        color
      });

      return res.status(201).json(newTag);
    } catch (error) {
      console.error('[TagController] create error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'El nombre de la etiqueta es requerido.' });
      }

      const existingTag = await tagRepository.findById(id, orgId);
      if (!existingTag) {
        return res.status(404).json({ error: 'Etiqueta no encontrada.' });
      }

      // Check name duplication if name changed
      if (name !== existingTag.name) {
        const duplicate = await tagRepository.findByName(name, orgId);
        if (duplicate) {
          return res.status(400).json({ error: 'Ya existe otra etiqueta con este nombre.' });
        }
      }

      const updated = await tagRepository.update(id, orgId, { name, color });
      return res.json(updated);
    } catch (error) {
      console.error('[TagController] update error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async delete(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;

      const deleted = await tagRepository.delete(id, orgId);
      if (!deleted) {
        return res.status(404).json({ error: 'Etiqueta no encontrada.' });
      }

      return res.json({ message: 'Etiqueta eliminada con éxito.' });
    } catch (error) {
      console.error('[TagController] delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async assignToContact(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id: contactId } = req.params;
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ error: 'tagId es requerido.' });
      }

      // Verify contact belongs to org
      const contact = await contactRepository.findById(contactId, orgId);
      if (!contact) {
        return res.status(404).json({ error: 'Contacto no encontrado.' });
      }

      await tagRepository.assignToContact(contactId, tagId, orgId);
      
      // Return updated contact details
      const updatedContact = await contactRepository.findById(contactId, orgId);
      return res.json(updatedContact);
    } catch (error) {
      console.error('[TagController] assignToContact error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  async unassignFromContact(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { id: contactId, tagId } = req.params;

      // Verify contact belongs to org
      const contact = await contactRepository.findById(contactId, orgId);
      if (!contact) {
        return res.status(404).json({ error: 'Contacto no encontrado.' });
      }

      const unassigned = await tagRepository.unassignFromContact(contactId, tagId, orgId);
      if (!unassigned) {
        return res.status(404).json({ error: 'Asociación de etiqueta no encontrada.' });
      }

      const updatedContact = await contactRepository.findById(contactId, orgId);
      return res.json(updatedContact);
    } catch (error) {
      console.error('[TagController] unassignFromContact error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TagController();
