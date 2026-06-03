const pipelineRepository = require('../repositories/pipelineRepository');

class PipelineController {
  async listPipelines(req, res) {
    try {
      const orgId = req.user.organizationId;
      const pipelines = await pipelineRepository.listPipelines(orgId);
      return res.json(pipelines);
    } catch (error) {
      console.error('[PipelineController] listPipelines error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listStages(req, res) {
    try {
      const { id } = req.params; // pipelineId
      const stages = await pipelineRepository.listStages(id);
      return res.json(stages);
    } catch (error) {
      console.error('[PipelineController] listStages error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new PipelineController();
