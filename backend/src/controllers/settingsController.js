const settingsRepository = require('../repositories/settingsRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

class SettingsController {
  async getSettings(req, res) {
    try {
      const orgId = req.user.organizationId;
      const settings = await settingsRepository.list(orgId);
      return res.json(settings);
    } catch (error) {
      console.error('[SettingsController] getSettings error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateSettings(req, res) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const { key, value } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Settings key and value are required' });
      }

      const oldVal = await settingsRepository.get(orgId, key);
      const updated = await settingsRepository.set(orgId, key, value);

      // Audit Log
      await auditLogRepository.logUpdate({
        organizationId: orgId,
        userId,
        action: 'SETTINGS_UPDATE',
        ipAddress: req.ip,
        entityType: 'settings',
        entityId: updated.id,
        oldEntity: oldVal !== null ? { value: oldVal } : null,
        newEntity: { value },
        metadata: { key }
      });

      return res.json(updated);
    } catch (error) {
      console.error('[SettingsController] updateSettings error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new SettingsController();
