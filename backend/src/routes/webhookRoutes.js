const express = require('express');
const webhookController = require('../controllers/webhookController');
const { webhookLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// GET is used for Meta verification, POST for receiving events
router.get('/whatsapp', webhookController.verify);
router.post('/whatsapp', webhookLimiter, webhookController.receive);

module.exports = router;
