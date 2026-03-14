// scripts/invitar-jurado.js
'use strict';

require('dotenv').config();
const axios = require('axios');
const https = require('https');
const pool = require('../src/db/pool');

const CHATBOT_WEBHOOK_URL = process.env.CHATBOT_WEBHOOK_URL || 'http://localhost:4000/webhook/initiate';
const EVENTO_JURADOS_ID = 5; // <--- ID DEL EVENTO ("PRESENTACION_PROYECTOS")

// Helper para formato de fecha
const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function formatChatbotDate(fechaHoraIso) {
    const cleaned  = String(fechaHoraIso).replace('+00:00', '').replace('Z', '');
    const fecha    = new Date(cleaned);
    const diaNombre = DAYS_ES[fecha.getDay()];
    const horas     = fecha.getHours();
    const minutos   = String(fecha.getMinutes()).padStart(2, '0');
    const ampm      = horas >= 12 ? 'PM' : 'AM';
    const hora12    = horas % 12 || 12;

    return {
        simple: `${diaNombre} ${hora12}:${minutos} ${ampm}`,
        full:   `${diaNombre} a las ${hora12}:${minutos} ${ampm}`
    };
}

async function main() {
    const candidatoId = process.argv[2];

    if (!candidatoId) {
        console.error('❌ Error: Debes proporcionar el UUID del jurado/candidato.');
        console.error('Uso: node scripts/invitar-jurado.js <UUID>');
        process.exit(1);
    }

    // Validar webhook
    if (!process.env.CHATBOT_WEBHOOK_URL) {
        console.warn('⚠️ Advertencia: CHATBOT_WEBHOOK_URL no está en .env. Usando default localhost.');
    }

    try {
        console.log(`🔍 Buscando jurado ${candidatoId}...`);

        // 1. Obtener datos del Jurado
        const candidateRes = await pool.query(`
            SELECT c.id, c.nombre, c.telefono, m.nombre as ciudad
            FROM public.candidatos c
            LEFT JOIN public.municipios m ON c.municipio_id = m.id
            WHERE c.id = $1
        `, [candidatoId]);

        const candidate = candidateRes.rows[0];
        if (!candidate) throw new Error('Jurado no encontrado en BD. Verifica el UUID.');

        // 2. Obtener el evento de Presentación (ID 5)
        console.log(`📅 Buscando evento de presentación (ID ${EVENTO_JURADOS_ID})...`);
        const eventRes = await pool.query(`
            SELECT id, tipo_reunion, fecha_hora 
            FROM public.eventos 
            WHERE id = $1
        `, [EVENTO_JURADOS_ID]);

        const evento = eventRes.rows[0];
        if (!evento) throw new Error(`El evento ID ${EVENTO_JURADOS_ID} no existe en la BD.`);

        // 3. Crear invitación forzada
        const fechaFmt = formatChatbotDate(evento.fecha_hora);
        const lista_horarios = `1) ${fechaFmt.simple}`;

        // Mensaje especial
        const mensaje = `Hola ${candidate.nombre}, te invitamos cordialmente a la presentación de nuestro Proyecto Integrador SofIA. \n\n` +
            `Horario disponible:\n${lista_horarios}\n\n` +
            `Por favor responde con "1" para confirmar asistencia.`;

        const payload = {
            candidato_id: candidate.id,
            telefono: candidate.telefono ? candidate.telefono.replace('+', '') : '',
            nombre: candidate.nombre,
            motivo: evento.tipo_reunion, // Usamos el tipo real del evento (ej: PRESENTACION_PROYECTOS)
            ciudad: candidate.ciudad || 'Medellín',
            lista_horarios: lista_horarios,
            eventos_disponibles: [{
                fecha_legible: fechaFmt.full,
                evento_id: evento.id
            }],
            mensaje: mensaje
        };

        // 4. Enviar
        console.log(`🚀 Enviando invitación a ${candidate.nombre}...`);
        console.log(`📡 URL: ${CHATBOT_WEBHOOK_URL}`);

        const agent = new https.Agent({ rejectUnauthorized: false });
        await axios.post(CHATBOT_WEBHOOK_URL, payload, {
            httpsAgent: agent,
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        console.log('✅ Invitación enviada con éxito.');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response) console.error('Detalle HTTP:', err.response.data);
    } finally {
        await pool.end();
    }
}

main();
