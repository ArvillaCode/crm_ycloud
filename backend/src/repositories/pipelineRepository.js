const db = require('../config/db');

class PipelineRepository {
  async listPipelines(orgId) {
    const query = 'SELECT * FROM pipelines WHERE organization_id = $1 ORDER BY name ASC';
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  async listStages(pipelineId, orgId) {
    const query = `
      SELECT ps.* FROM pipeline_stages ps
      INNER JOIN pipelines p ON ps.pipeline_id = p.id
      WHERE ps.pipeline_id = $1 AND p.organization_id = $2
      ORDER BY ps.order_index ASC
    `;
    const result = await db.query(query, [pipelineId, orgId]);
    return result.rows;
  }

  async findStageById(stageId) {
    const query = 'SELECT * FROM pipeline_stages WHERE id = $1';
    const result = await db.query(query, [stageId]);
    return result.rows[0] || null;
  }
}

module.exports = new PipelineRepository();
