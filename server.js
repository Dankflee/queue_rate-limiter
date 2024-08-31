require('dotenv').config();
const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Redis client 
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20, // 20 requests per minute
  keyGenerator: (req) => req.body.user_id,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

const speedLimiter = slowDown({
  windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS) || 1000, // 1 second
  delayAfter: 1, // allow 1 request per second, then...
  delayMs: () => parseInt(process.env.SLOW_DOWN_DELAY_MS) || 500, // delay by 500ms
  keyGenerator: (req) => req.body.user_id,
});

async function task(user_id) {
  const timestamp = Date.now();
  const logMessage = `${user_id}-task completed at-${timestamp}\n`;
  
  fs.appendFile(path.join(__dirname, 'task_log.txt'), logMessage, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
  
  console.log(logMessage);
}

async function processQueue() {
  while (true) {
    try {
      const job = await redis.lpop('taskQueue');
      if (job) {
        const { user_id } = JSON.parse(job);
        await task(user_id);
      } else {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait if queue is empty
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
    }
  }
}

app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to the Task Queue API',
      usage: {
        endpoint: '/process-task',
        method: 'POST',
        body: { user_id: 'string' },
        description: 'Queue a task for processing'
      }
    });
});

// API 
app.post('/process-task', express.json(), limiter, speedLimiter, async (req, res) => {
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    await redis.rpush('taskQueue', JSON.stringify({ user_id }));
    res.json({ message: 'Task queued successfully' });
  } catch (error) {
    console.error('Error queueing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });

  processQueue();
} else {
  app.listen(port, () => {
    console.log(`Worker ${process.pid} started and listening on port ${port}`);
  });
}