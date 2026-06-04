const express = require('express');
const tagController = require('../controllers/tagController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { tagSchemas } = require('../utils/validationSchemas');

const router = express.Router();

router.use(authenticateJWT);

router.get('/', tagController.list);
router.post('/', tagController.create); // Joi validation added later if needed
router.put('/:id', tagController.update);
router.delete('/:id', tagController.delete);

module.exports = router;
