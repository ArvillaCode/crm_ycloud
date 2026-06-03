const express = require('express');
const pipelineController = require('../controllers/pipelineController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateJWT);

router.get('/', pipelineController.listPipelines);
router.get('/:id/stages', pipelineController.listStages);

module.exports = router;
