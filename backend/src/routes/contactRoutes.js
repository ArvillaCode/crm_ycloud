const express = require('express');
const contactController = require('../controllers/contactController');
const tagController = require('../controllers/tagController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { contactSchemas } = require('../utils/validationSchemas');

const router = express.Router();

router.use(authenticateJWT);

router.get('/', contactController.list);
router.get('/:id', contactController.get);
router.post('/', validateRequest(contactSchemas.create), contactController.create);
router.put('/:id', validateRequest(contactSchemas.update), contactController.update);
router.delete('/:id', contactController.delete);

// Tag management for specific contacts
router.post('/:id/tags', tagController.assignToContact);
router.delete('/:id/tags/:tagId', tagController.unassignFromContact);

module.exports = router;
