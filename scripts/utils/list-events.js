// scripts/list-events.js
require('dotenv').config();
const pool = require('../../src/db/pool');

async function main() {
    try {
        console.log('📅 Listando próximos eventos DISPONIBLES...');
        const res = await pool.query(`
      SELECT id, fecha_hora, tipo_reunion, inscritos_actuales 
      FROM public.eventos 
      WHERE estado = 'DISPONIBLE'
      ORDER BY fecha_hora ASC
      LIMIT 10
    `);

        if (res.rows.length === 0) {
            console.log('⚠️ No hay eventos disponibles futuros.');
        } else {
            console.table(res.rows);
        }
    } catch (err) {
        console.error('❌ Error consultando eventos:', err.message);
    } finally {
        await pool.end();
    }
}

main();
