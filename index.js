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
      // Muestra el enlace clickable
      const url = `http://localhost:${PORT}`;
      console.log('\n\n' + '='.repeat(50));
      console.log(`🚀 Servidor corriendo en: ${url}`);
      console.log('='.repeat(50) + '\n');

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
