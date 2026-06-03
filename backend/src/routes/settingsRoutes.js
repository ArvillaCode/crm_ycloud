const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { settingsSchemas } = require('../utils/validationSchemas');
const { checkRole } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(authenticateJWT);

router.get('/', settingsController.getSettings);
router.post('/', checkRole(['admin']), validateRequest(settingsSchemas.upsert), settingsController.updateSettings);

module.exports = router;
