require('dotenv').config();
require('./config/sentry');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// Import configurations and loggers
const logger = require('./config/logger');

// Validate critical production environment variables
if (process.env.NODE_ENV === 'production') {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'default_dev_key_must_be_32_bytes_long') {
    logger.error('[Boot] CRITICAL: ENCRYPTION_KEY must be set to a secure, custom 32-byte secret in production!');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkey') {
    logger.error('[Boot] CRITICAL: JWT_SECRET must be set to a secure, custom secret in production!');
    process.exit(1);
  }
}

const httpLogger = require('./middlewares/logMiddleware');
const db = require('./config/db');
const redisClient = require('./config/redis');

const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const pipelineRoutes = require('./routes/pipelineRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Required when running behind Coolify / reverse proxy.
// Fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit.
app.set('trust proxy', 1);

const server = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL;

const io = new Server(server, {
  cors: {
    origin: frontendUrl || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Bind io to express app and socket utility helper
app.set('io', io);
require('./utils/socket').set(io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      !frontendUrl ||
      origin === frontendUrl ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(httpLogger);

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health probes for DevOps monitoring
app.get('/api/health/live', (req, res) => {
  return res.json({ status: 'UP' });
});

app.get('/api/health/ready', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT 1');
    const redisCheck = await redisClient.ping();

    let queueStats = null;

    try {
      const { webhookQueue } = require('./services/queue/webhookQueue');
      queueStats = await webhookQueue.getJobCounts('active', 'wait', 'failed', 'completed');
    } catch (qError) {
      logger.error('[Health Check] Failed to get queue stats:', qError);
    }

    if (dbCheck.rowCount !== 1 || redisCheck !== 'PONG') {
      logger.error('[Health Check] Service ready check failed: services DOWN');

      return res.status(503).json({
        status: 'DOWN',
        services: {
          database: dbCheck.rowCount === 1 ? 'healthy' : 'unhealthy',
          redis: redisCheck === 'PONG' ? 'healthy' : 'unhealthy',
        },
        queue: queueStats,
      });
    }

    return res.json({
      status: 'READY',
      services: {
        database: 'healthy',
        redis: 'healthy',
      },
      queue: queueStats,
    });
  } catch (error) {
    logger.error('[Health Check] Exception during ready check:', error);

    return res.status(503).json({
      status: 'DOWN',
      error: error.message,
    });
  }
});

// Socket.io JWT authentication middleware
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication error: Token is required'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    socket.user = decoded;
    return next();
  });
});

// Socket.io real-time connection handler
io.on('connection', (socket) => {
  const orgId = socket.user.organizationId;

  socket.join(orgId);

  logger.info(`Socket connected: ${socket.id} | User: ${socket.user.userId} | Org: ${orgId}`);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Wire Sentry Express Error Handler after all routes
if (process.env.SENTRY_DSN) {
  const Sentry = require('./config/sentry');
  Sentry.setupExpressErrorHandler(app);
}

// Start the server
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = { app, server, io };