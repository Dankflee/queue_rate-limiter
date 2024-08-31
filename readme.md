# Node.js Task Queue with Rate Limiting

This project implements a Node.js API cluster with two replica sets, featuring a task queuing system with rate limiting. It processes user tasks at a rate of 1 task per second and 20 tasks per minute for each user ID.

## Features

- Node.js API cluster with two replica sets
- Rate limiting: 1 task/second and 20 tasks/minute per user
- Task queuing system using Redis
- Logging of completed tasks to a file
- Resilient to failures and handles edge cases

## Prerequisites

- Node.js (v14 or later)
- Redis server

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/nodejs-task-queue.git
   cd nodejs-task-queue
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Ensure Redis is running on localhost:6379 (or update the Redis configuration in the code)

## Usage

1. Start the server:
   ```
   node server.js
   ```

2. The API will be available at `http://localhost:3000`

3. To process a task, send a POST request to `/process-task` with a JSON body:
   ```json
   {
     "user_id": "123"
   }
   ```

## Configuration

- The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable.
- Redis configuration can be adjusted in the `redis` object in `server.js`.

## Testing

To test the rate limiting and queueing:

1. Use a tool like [Apache Benchmark](https://httpd.apache.org/docs/2.4/programs/ab.html) or write a simple script to send multiple requests rapidly.

2. Check the `task_log.txt` file to verify task execution times and rate limiting.

## Architecture

- The application uses a cluster with two worker processes to handle requests.
- Redis is used for inter-process communication and task queueing.
- Rate limiting is implemented using `express-rate-limit` and `express-slow-down`.
- Tasks are logged to both console and a `task_log.txt` file.

## Error Handling

- Requests exceeding rate limits are queued and processed when possible.
- The cluster automatically restarts workers if they crash.

## Improvements and Scaling

- For production, consider using a process manager like PM2.
- Implement more robust error handling and logging.
- Use a separate Redis instance for rate limiting to improve performance.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.