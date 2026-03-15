// scripts/test-network.js
/**
 * Script de diagnóstico simple para verificar conectividad
 * Recuperado para compatibilidad con botones de IDE
 */
'use strict';
require('dotenv').config();
const dns = require('dns');
const pool = require('../../src/db/pool');

console.log('\n--- 📡 DIAGNÓSTICO RÁPIDO SOFIA ---');

// 1. Verificar Internet (Resolución DNS)
dns.lookup('google.com', (err) => {
    if (err) {
        console.error('❌ Internet: SIN CONEXIÓN O FALLA DNS');
    } else {
        console.log('✅ Internet: OPERATIVO');
    }
});

// 2. Verificar Variables de Entorno Clave
const checks = [
    { name: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { name: 'CHATBOT_WEBHOOK_URL', val: process.env.CHATBOT_WEBHOOK_URL }
];

checks.forEach(c => {
    if (c.val) console.log(`✅ ENV ${c.name}: OK`);
    else console.warn(`⚠️ ENV ${c.name}: FALTA O VACÍO`);
});

// 3. Verificar Conexión a Base de Datos
(async () => {
    try {
        const res = await pool.query('SELECT current_database(), current_user, version()');
        const dbInfo = res.rows[0];
        console.log(`✅ Base de Datos: CONECTADA a '${dbInfo.current_database}' como '${dbInfo.current_user}'`);
    } catch (err) {
        console.error(`❌ Base de Datos: ERROR - ${err.message}`);
    } finally {
        await pool.end();
        console.log('-----------------------------------\n');
    }
})();

