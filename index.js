/**
 * index.js – SofIA Chatbot entry point
 */
'use strict';

require('dotenv').config();

const app        = require('./src/app');
const logger     = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function main() {
  await new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info({ event: 'server_started', port: PORT }, `HTTP server listening on :${PORT}`);
      resolve();
    });
  });

  logger.info({ event: 'sofia_chat_ready' }, '✅ SofIA Chatbot Service is running');
}

main().catch((err) => {
  logger.error({ event: 'fatal_startup_error', err: err.message }, 'Failed to start SofIA');
  process.exit(1);
});
