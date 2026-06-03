const logger = require('../config/logger');

function httpLogger(req, res, next) {
  const start = Date.now();
  
  // Track response completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(logMsg, { method, url: originalUrl, statusCode, duration, ip });
    } else if (statusCode >= 400) {
      logger.warn(logMsg, { method, url: originalUrl, statusCode, duration, ip });
    } else {
      logger.info(logMsg, { method, url: originalUrl, statusCode, duration, ip });
    }
  });

  next();
}

module.exports = httpLogger;
