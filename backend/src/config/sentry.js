const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  console.log('[Sentry] Initialized successfully');
} else {
  console.warn('[Sentry] SENTRY_DSN is not configured. Sentry logging is disabled.');
}

module.exports = Sentry;
