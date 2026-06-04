const express = require('express');
const conversationController = require('../controllers/conversationController');
const messageController = require('../controllers/messageController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { messageSchemas } = require('../utils/validationSchemas');

const router = express.Router();

router.use(authenticateJWT);

router.get('/', conversationController.list);
router.post('/', conversationController.create);
router.get('/:id', conversationController.get);
router.put('/:id/status', conversationController.updateStatus);
router.get('/:id/messages', conversationController.getMessages);
router.post('/:conversationId/messages', validateRequest(messageSchemas.send), messageController.send);

module.exports = router;
