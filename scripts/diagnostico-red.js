// scripts/diagnostico-red.js
const axios = require('axios');
const https = require('https');

// ⚠️ Asegúrate de pedirle a tu compañera la URL de Ngrok ACTUALIZADA
const URL = 'https://rae-compensable-unmunificently.ngrok-free.dev/solicitar-chat';

const payload = {
  candidato_id: "00000000-0000-0000-0000-000000000000",
  telefono: "573112790495",
  nombre: "Usuario de Prueba",
  motivo: "PRUEBA_LOGICA",
  ciudad: "Medellín",
  lista_horarios: "1) Lunes 8:00 AM\n2) Martes 9:00 AM",
  eventos_disponibles: [
    { fecha_legible: "Lunes a las 8:00 AM", evento_id: 1 },
    { fecha_legible: "Martes a las 9:00 AM", evento_id: 2 }
  ],
  mensaje: "Hola, esto es un mensaje de diagnóstico de red desde SofIA."
};


async function testConnection() {
  console.log(`📡 Probando conexión a: ${URL}`);

  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  try {
    const res = await axios.post(URL, payload, {
      httpsAgent: agent,
      timeout: 5000, // Máximo espera 5 segundos
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'SofIA-Diagnostico/1.0',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Éxito! El servidor de tu compañera respondió.');
    console.log('Status HTTP:', res.status);
    console.log('Respuesta:', res.data);

    // Forzamos el cierre exitoso
    process.exit(0);

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('\n❌ TIMEOUT ERROR ❌');
      console.error('El servidor de tu compañera no respondió después de 5 segundos.');
      console.error('Posibles causas:');
      console.error('1. Su Ngrok está apagado.');
      console.error('2. Su URL cambió y necesitas actualizar el script.');
      console.error('3. Su servidor de Node.js (bot) está caído.');
    }
    else if (err.code === 'ENOTFOUND') {
      console.error('\n❌ ERROR DNS ❌');
      console.error('La URL de Ngrok no existe. Revisa que esté bien escrita.');
    }
    else if (err.response) {
      console.error(`\n❌ ERROR DEL SERVIDOR REMOTO (Status ${err.response.status}) ❌`);
      console.error(err.response.data);
    }
    else {
      console.error('\n❌ ERROR DESCONOCIDO ❌');
      console.error(err.message);
    }

    // Forzamos el cierre con error para destrabar el panel
    process.exit(1);
  }
}

testConnection();
