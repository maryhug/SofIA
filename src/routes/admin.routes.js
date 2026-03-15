// src/routes/admin.routes.js

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const ngrok = require('ngrok');

// LISTA BLANCA ACTUALIZADA
const ALLOWED_SCRIPTS = {
    // DB
    'create-logs-table.js': 'db',
    'reset-db.js': 'db',
    'setup-logs-db.js': 'db',

    // Testing
    'test-network.js': 'testing',
    'test-chatbot-direct.js': 'testing',
    'test-chatbot.js': 'testing',
    'test-db-connection.js': 'testing',
    'test-ngrok.js': 'testing',
    'test-webhook-scenarios.js': 'testing',
    'test-webhook-response.js': 'testing',

    // Utils
    'check-candidate.js': 'utils',
    'get-candidates.js': 'utils',
    'invite-judge.js': 'utils',
    'clear-webhook-logs.js': 'utils',
    'list-events.js': 'utils',
    'reset-candidate.js': 'utils',
    'bulk-trigger-chatbot.js': 'utils',
    'view-webhook-logs.js': 'utils',
    'view-candidate-payload.js': 'utils'
};

// Endpoint para ejecutar scripts
router.post('/run-script', (req, res) => {
    const { scriptName, arg, flag } = req.body;

    // Buscamos a qué carpeta pertenece el script
    const folder = ALLOWED_SCRIPTS[scriptName];

    if (!folder) {
        return res.status(403).json({ output: `❌ Error: El script '${scriptName}' no está permitido o no existe.` });
    }

    let safeArg = arg ? arg.replace(/[;&|`$]/g, '') : '';
    let safeFlag = flag === '--total' ? '--total' : '';

    // Agregamos la subcarpeta dinámicamente en el comando
    const cmdParts = ['node', `scripts/${folder}/${scriptName}`];

    if (safeFlag) cmdParts.push(safeFlag);
    if (safeArg) cmdParts.push(safeArg);

    const command = cmdParts.join(' ');

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ output: `⚠️ Error de ejecución:\n${stderr || error.message}` });
        }
        res.json({ output: stdout || '✅ Ejecutado correctamente (sin salida en consola).' });
    });
});

// Endpoint de ngrok
router.post('/start-ngrok', async (req, res) => {
    try {
        const port = process.env.PORT || 3000;
        const url = await ngrok.connect(port);
        res.json({ output: `✅ Ngrok conectado exitosamente.\nURL: ${url}`, url: url });
    } catch (err) {
        res.status(500).json({ output: `❌ Error al iniciar Ngrok:\n${err.message}` });
    }
});

module.exports = router;
