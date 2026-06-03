const { createLogger, format, transports } = require('winston');
const path = require('path');

const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'accessToken',
  'access_token',
  'jwt',
  'ycloud_api_key',
  'apiKey',
  'body',
  'content',
  'payload',
  'access_token',
  'verify_token'
];

/**
 * Recursively search and redact keys from logs
 */
function redactSensitive(val) {
  if (val === null || val === undefined) return val;
  
  if (Array.isArray(val)) {
    return val.map(redactSensitive);
  }
  
  if (typeof val === 'object') {
    const scrubbed = {};
    for (const [k, v] of Object.entries(val)) {
      const isSensitive = SENSITIVE_KEYS.some(sKey => k.toLowerCase().includes(sKey.toLowerCase()));
      if (isSensitive) {
        scrubbed[k] = '[REDACTED]';
      } else {
        scrubbed[k] = redactSensitive(v);
      }
    }
    return scrubbed;
  }
  
  return val;
}

const redactFormat = format((info) => {
  const result = redactSensitive(info);
  Object.assign(info, result);
  return info;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    redactFormat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'whatsapp-crm' },
  transports: [
    // Output error logs to error.log
    new transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Output combined logs to combined.log
    new transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If in development mode, output human-readable colorized logs to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      redactFormat(),
      format.colorize(),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

module.exports = logger;
