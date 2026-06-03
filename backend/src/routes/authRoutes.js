const express = require('express');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { authSchemas } = require('../utils/validationSchemas');
const { authLimiter, refreshLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, validateRequest(authSchemas.login), authController.login);
router.post('/register', validateRequest(authSchemas.register), authController.register);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/organizations', authController.listOrganizations);

module.exports = router;
