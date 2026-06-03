const rateLimit = require('express-rate-limit');

// Authentication Brute-Force Rate Limiter (15 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Por favor, inténtelo de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resilient Webhooks Rate Limiter (600 requests per minute)
// Configured to be generous so legitimate retries from Meta/YCloud are not falsely blocked
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  message: {
    error: 'Límite de solicitudes de webhook superado. Inténtelo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Refresh Token Rate Limiter (30 requests per 15 minutes)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    error: 'Demasiadas solicitudes de renovación de sesión. Inténtelo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  webhookLimiter,
  refreshLimiter,
};
