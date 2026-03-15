// scripts/bulk-trigger-chatbot.js
'use strict';

/**
 * script: bulk-trigger-chatbot.js
 * Descripción: Busca candidatos que cumplan la condición de "9 llamadas fallidas hoy"
 * y dispara el chatbot para ellos en lotes (batch) de 4 candidatos.
 * 
 * Uso: node scripts/bulk-trigger-chatbot.js
 */

require('dotenv').config();
const pool = require('../../src/db/pool');
const chatbotService = require('../../src/services/chatbot.service');

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 10_000;

async function main() {
  console.log('🚀 Iniciando proceso masivo de Chatbot (Lote de 4)...');

  try {
    // 1. Buscar candidatos elegibles
    // Criterio solicitado: Hitos exactos 9, 18, 27 y estado PENDIENTE/NO_CONTESTA
    
    console.log('🔍 Buscando candidatos con intentos_llamada IN (9, 18, 27) y estado PENDIENTE/NO_CONTESTA ...');
    
    // Función de reintento para consultas
    async function queryWithRetry(queryText, params, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          return await pool.query(queryText, params);
        } catch (err) {
          console.warn(`⚠️ Intento ${i + 1}/${retries} fallido: ${err.message}`);
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, 2000)); // Esperar 2s antes de reintentar
        }
      }
    }

    const baseQuery = `
      SELECT c.id as candidato_id, c.intentos_llamada as failed_count
      FROM public.candidatos c
      JOIN public.estados_gestion eg ON c.estado_gestion_id = eg.id
      WHERE c.intentos_llamada IN (9, 18, 27)
        AND eg.codigo IN ('PENDIENTE', 'NO_CONTESTA')
    `;

    const processedIds = [];
    let totalProcesados = 0;

    while (true) {
      const query = processedIds.length
        ? `${baseQuery} AND NOT (c.id = ANY($2::uuid[])) LIMIT $1`
        : `${baseQuery} LIMIT $1`;

      const params = processedIds.length ? [BATCH_SIZE, processedIds] : [BATCH_SIZE];
      const res = await queryWithRetry(query, params);
      const candidatos = res.rows;

      if (candidatos.length === 0) {
        console.log('✅ No hay más candidatos para procesar.');
        break;
      }

      console.log()
      console.log(`✅ Se encontraron ${candidatos.length} candidatos para este lote.`);

      // 2. Procesar en lote
      for (const cand of candidatos) {
        const uuid = cand.candidato_id;
        processedIds.push(uuid);
        console.log(`\n-----------------------------------------------------------`);
        console.log(`🤖 Procesando candidato: ${uuid} (Intentos fallidos: ${cand.failed_count})`);
        
        try {
          // Usamos gatherCandidateData y sendToChatbot que ya existen
          // No usamos 'shouldTriggerChatbot' porque ya validamos en la query masiva
          const data = await chatbotService.forceChatbotTrigger(uuid);
          
          if (!data) {
              console.log(`❌ No se pudo contactar a ${uuid}: sin respuesta del servicio`);
          } else if (data.error_envio) {
              console.log(`❌ No se pudo contactar a ${uuid}: ${data.message}`);
          } else {
              console.log(`✅ Envío exitoso para ${uuid}`);
          }

        } catch (err) {
          console.error(`❌ Error procesando candidato ${uuid}:`, err.message);
        }
        
        // Pequeña pausa para no saturar
        await new Promise(r => setTimeout(r, 1000));
      }

      totalProcesados += candidatos.length;

      console.log(`⏳ Esperando ${BATCH_DELAY_MS / 1000} segundos para el siguiente lote...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    console.log(`\n🏁 Proceso masivo finalizado. Total procesados: ${totalProcesados}`);
    
  } catch (err) {
    console.error('❌ Error general en script masivo:', err);
  } finally {
    pool.end();
  }
}

main();
