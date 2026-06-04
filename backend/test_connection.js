const { Client } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

async function testPostgres() {
  console.log(`Checking PostgreSQL connection to ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}...`);
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    console.log('PostgreSQL Connection: SUCCESSFUL');
    await client.end();
    return { success: true };
  } catch (err) {
    console.log('PostgreSQL Connection: FAILED');
    console.log(`  Details: ${err.message}`);
    console.log(`  Code: ${err.code || 'N/A'}`);
    return { success: false, error: err };
  }
}

async function testRedis() {
  console.log(`Checking Redis connection to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}...`);
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 3000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null, // Do not retry on connection failures during test
  });

  try {
    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        resolve();
      });
      redis.on('error', (err) => {
        reject(err);
      });
    });
    console.log('Redis Connection: SUCCESSFUL');
    redis.disconnect();
    return { success: true };
  } catch (err) {
    console.log('Redis Connection: FAILED');
    console.log(`  Details: ${err.message}`);
    redis.disconnect();
    return { success: false, error: err };
  }
}

async function main() {
  console.log('--- STARTING DATABASE AND REDIS CONNECTIVITY TEST ---');
  const pgResult = await testPostgres();
  console.log('----------------------------------------------------');
  const redisResult = await testRedis();
  console.log('-------------------- END OF TEST --------------------');
  process.exit(pgResult.success && redisResult.success ? 0 : 1);
}

main();
