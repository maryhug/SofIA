// Archivo: src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const ngrok = require('ngrok');

// LISTA BLANCA: Solo tus scripts del flujo y utilidades del README
const ALLOWED_SCRIPTS = [
    'reset-maryhug.js',
    'test-ngrok.js',
    'trigger-masivo-chatbot.js',
    'check-candidate.js',
    'list-events.js',          // Nuevo: Ver horarios disponibles en BD
    'llenar-cola.js',          // Nuevo: Simular horarios para llamadas
    'test-db-connection.js'    // Nuevo: Health check de Supabase
];

// Endpoint para ejecutar scripts
router.post('/run-script', (req, res) => {
    const { scriptName, arg } = req.body;

    // Validación 1: Lista blanca
    if (!ALLOWED_SCRIPTS.includes(scriptName)) {
        return res.status(403).json({ output: `❌ Error: El script '${scriptName}' no está permitido.` });
    }

    // Validación 2: Sanitización de argumentos (Buena práctica de seguridad)
    // Evita inyección de comandos en consola
    let safeArg = '';
    if (arg) {
        safeArg = arg.replace(/[;&|`$]/g, '');
    }

    const command = `node scripts/${scriptName} ${safeArg}`.trim();

    // Ejecuta el comando usando Node
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ output: `⚠️ Error de ejecución:\n${stderr || error.message}` });
        }
        res.json({ output: stdout || '✅ Ejecutado correctamente (sin salida en consola).' });
    });
});

// Endpoint para despertar Ngrok desde el panel
router.post('/start-ngrok', async (req, res) => {
    try {
        const port = process.env.PORT || 3000;
        const url = await ngrok.connect(port);
        res.json({
            output: `✅ Ngrok conectado exitosamente.\nURL: ${url}`,
            url: url // Mandamos la URL pura para que el Front la copie automáticamente
        });
    } catch (err) {
        res.status(500).json({ output: `❌ Error al iniciar Ngrok:\n${err.message}` });
    }
});

module.exports = router;
