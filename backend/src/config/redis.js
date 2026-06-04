const Redis = require('ioredis');
require('dotenv').config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  console.log('Redis client connected successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

module.exports = redisClient;
