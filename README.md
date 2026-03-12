# SofIA – Servicio de Llamadas Automáticas 📞

Backend en Node.js que reemplaza los flujos n8n (**Asesor Nueva BD** + **Varios**).  
Gestiona la cola de llamadas, llama a candidatos vía **ElevenLabs ConvAI** y actualiza
Supabase cuando llega el webhook con el resultado.

---

## 📋 Tabla de contenidos

1. [Requisitos previos](#-requisitos-previos)
2. [Instalación](#-instalación)
3. [Variables de entorno](#-variables-de-entorno)
4. [Comandos npm](#-comandos-npm)
5. [Flujo recomendado](#-flujo-recomendado)
6. [Endpoints HTTP](#-endpoints-http)
7. [Estructura del proyecto](#-estructura-del-proyecto)
8. [Diagnóstico de problemas](#-diagnóstico-de-problemas)

---

## 🛠 Requisitos previos

- **Node.js 18+**
- Proyecto en [Supabase](https://supabase.com) con el esquema SQL ya aplicado (`sql_sofia.txt`)
- Cuenta en [ElevenLabs](https://elevenlabs.io) con agente ConvAI y número Twilio configurados
- [ngrok](https://ngrok.com) instalado en `C:\ngrok\ngrok.exe` (solo para pruebas locales)

---

## 📦 Instalación

```powershell
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración
copy .env.example .env

# 3. Editar .env con tus credenciales reales
notepad .env
```

---

## 🔑 Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con lo siguiente:

```env
# ── Base de datos Supabase ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# ── ElevenLabs ConvAI ──────────────────────────────────────────────────────
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_PHONE_NUMBER_ID=phnum_...

# ── Modo mock: true = sin llamadas reales, false = llamadas reales ──────────
ELEVENLABS_MOCK=true

# ── Worker y concurrencia ──────────────────────────────────────────────────
MAX_CONCURRENT_CALLS=3
QUEUE_INTERVAL_MS=10000

# ── Cron jobs (hora Colombia, UTC-5) ──────────────────────────────────────
CRON_FILL_MANANA=0 7 * * *
CRON_FILL_TARDE=0 14 * * *
CRON_FILL_NOCHE=0 19 * * *

# ── Servidor HTTP ─────────────────────────────────────────────────────────
PORT=3000

# ── Chatbot Integration ───────────────────────────────────────────────────
CHATBOT_WEBHOOK_URL=http://localhost:8000/solicitar-chat
```

### Variables que envía el sistema al agente de ElevenLabs

El agente necesita estas variables dinámicas en cada llamada:

| Variable | Descripción |
|---|---|
| `id` | UUID del candidato |
| `nombre` | Nombre completo (nombre + apellido) |
| `motivo` | Fase actual o motivo de la llamada |
| `ciudad` | Municipio del candidato |
| `lista_horarios` | Opciones de fecha en texto legible |
| `eventos_disponibles` | Fechas con IDs para que el agente confirme |
| `intentos` | Número de intentos previos de llamada |
| `nota_previa` | Nota del último contacto o preferencia de horario |

---

## 📜 Comandos npm

### `npm start`
Arranca el servidor en **producción**.
- Levanta el servidor HTTP.
- Inicia los Cron Jobs y el Worker de llamadas.
- Escucha webhooks de ElevenLabs y del Chatbot.

### `npm run dev`
Igual que `start`, pero **reinicia automáticamente** si detecta cambios en el código. Ideal para desarrollo.

### `npm run estado`
Muestra un reporte rápido en consola del estado actual de la cola de llamadas (Pendientes, En Curso, Completadas).

### `npm run test:chatbot -- <UUID>`
Prueba manual del disparador del Chatbot. Envía los datos del candidato a la URL configurada en `.env` sin esperar a las 9 llamadas fallidas.
*Ejemplo:* `npm run test:chatbot -- 0dd9d7da-525f-44ad-997a-8e52103b765b`

### `npm run limpiar`
Resetea la tabla `cola_llamadas` (borra todo lo pendiente). Útil para empezar de cero un día de pruebas.

### `npm run limpiar:total`
⚠ **PELIGRO:** Borra TODAS las llamadas históricas y reinicia los contadores de los candidatos. Deja la BD como nueva.

---

## 🤖 Integración con Chatbot

Esta funcionalidad permite contactar por WhatsApp (u otro medio) a los candidatos que **no contestan las llamadas**.

### ¿Cómo funciona?

1.  **Regla de Negocio:**
    El sistema cuenta cuántas veces ha sido llamado un candidato HOY y ha dado `NO_CONTESTA`.
    
2.  **Disparador (Trigger):**
    Cuando el contador llega a **9 llamadas fallidas** (3 mañana, 3 tarde, 3 noche), SofIA "despierta" y envía los datos del candidato a una API externa (tu bot en ngrok/n8n).

3.  **Envío de Datos:**
    Se hace un `POST` a la URL definida en `CHATBOT_WEBHOOK_URL` (en tu archivo `.env`).
    
    **Ejemplo del JSON enviado:**
    ```json
    {
      "telefono": "3001234567",         // Sin el '+'
      "nombre": "Carlos Perez",
      "motivo": "ENTREVISTA",
      "ciudad": "Medellín",
      "lista_horarios": "1) lunes 3:00 PM\n2) martes 7:00 PM",
      "eventos_disponibles": [
        { "fecha_legible": "lunes a las 3:00 PM", "evento_id": 1 },
        { "fecha_legible": "martes a las 7:00 PM", "evento_id": 2 }
      ]
    }
    ```

4.  **Respuesta del Chatbot (Opcional):**
    Si tu bot logra contactar al usuario, puede reportar el resultado de vuelta a SofIA enviando un `POST` a:
    `http://tu-servidor-sofia/api/chatbot/webhook`

---

## 🕵️‍♂️ ¿Cómo ver el JSON que llega a mi compañera?

Si tu compañera está recibiendo los datos mediante **ngrok**, la forma más fácil de ver qué le llegó es usar la interfaz de inspección de ngrok.

1.  **En la máquina de ella** (donde corre ngrok), abre el navegador y entra a:
    👉 **http://localhost:4040**

2.  Ahí verá una lista de todas las peticiones que le han llegado.
3.  Busca la última petición `POST` y haz clic en ella.
4.  A la derecha verá el **Header** y el **Body** (el JSON completo que SofIA le envió).

*Si ella usa n8n o un servidor en la nube, debe revisar el historial de ejecuciones de su webhook.*

---

## 🚀 Flujo Correcto para Pruebas

Si quieres probar todo el ciclo sin esperar llamadas reales:

1.  **Configura tu entorno:**
    Asegúrate de tener `.env` con las credenciales y la URL del chatbot (`CHATBOT_WEBHOOK_URL`).

2.  **Inicia SofIA:**
    ```powershell
    npm start
    ```

3.  **Dispara el Chatbot manualmente:**
    En otra terminal, elige un candidato (copia su ID de la base de datos) y ejecuta:
    ```powershell
    npm run test:chatbot -- <PEGAR_UUID_AQUI>
    ```

4.  **Verifica el envío:**
    - En la terminal de SofIA verás: `[ChatbotService] Enviando datos...`
    - En el navegador de tu compañera (`http://localhost:4040`) debería aparecer la petición recibida.

---

## 🌐 Endpoints HTTP Disponibles

### `POST /webhook`
Recibe los resultados de las llamadas de **ElevenLabs**. Actualiza el estado de la llamada y ageda al candidato si es necesario.

### `POST /api/chatbot/webhook`
Recibe actualizaciones del **Chatbot externo**.
*Body esperado:*
```json
{
  "candidato_id": "uuid...",
  "estado_gestion": "CONTACTADO",
  "nota": "El usuario prefiere mañana"
}
```

### `POST /api/chatbot/trigger-manual`
Endpoint de utilidad para forzar el envío de datos al chatbot sin cumplir la regla de 9 llamadas.
*Body:* `{ "candidato_id": "uuid..." }`

---

## 🗂 Estructura del proyecto

```
SofIA/
├── index.js                        # Punto de entrada: servidor + crons + worker
├── .env                            # Variables de entorno (NO subir a git)
├── package.json
│
├── src/
│   ├── app.js                      # Express: rutas y middleware
│   │
│   ├── db/                         # Capa de acceso a datos (queries SQL)
│   │   ├── pool.js                 # Conexión PostgreSQL a Supabase
│   │   ├── candidatos.js           # Queries sobre la tabla candidatos
│   │   ├── cola.js                 # Queries sobre cola_llamadas
│   │   ├── eventos.js              # Queries sobre eventos
│   │   ├── llamadas.js             # Queries sobre llamadas
│   │   └── lookups.js              # IDs de estados, resultados, horarios
│   │
│   ├── routes/
│   │   ├── health.js               # GET /health
│   │   └── webhook.js              # POST /webhook/elevenlabs-resultado
│   │
│   ├── schedulers/
│   │   └── index.js                # Cron jobs × 3 diarios (mañana/tarde/noche)
│   │
│   ├── services/
│   │   ├── cola/
│   │   │   ├── fillQueue.js        # llenarColaParaFranja() → INSERT cola_llamadas
│   │   │   └── processQueue.js     # runQueueIteration() + startQueueWorker()
│   │   ├── llamadas/
│   │   │   └── callService.js      # makeOutboundCall() → API ElevenLabs
│   │   └── webhook/
│   │       └── webhookService.js   # Actualiza DB al recibir resultado
│   │
│   └── utils/
│       ├── dateHelpers.js          # Formateo de fechas legibles para el agente
│       ├── logger.js               # Logger JSON estructurado
│       └── timeValidator.js        # Valida ventana horaria Colombia (06-22h)
│
└── scripts/                        # Scripts de prueba y utilidades
    ├── 1-test-db.js                # npm run test:db
    ├── 2-test-fill-queue.js        # npm run test:fill
    ├── 3-test-worker.js            # npm run test:worker
    ├── 4-test-webhook.js           # npm run test:webhook
    ├── 5-llamada-real.js           # npm run llamada
    ├── 6-ver-estado.js             # npm run estado
    └── 7-limpiar-llamadas.js       # npm run limpiar
```

---

## 🔍 Diagnóstico de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `test:db` falla en todos los tests | `DATABASE_URL` incorrecta | Revisar credenciales en `.env` |
| `test:fill` inserta 0 filas | No hay candidatos `PENDIENTE` | Verificar tabla `candidatos` en Supabase |
| `test:worker` no procesa a nadie | Cola vacía o fuera del horario 06–22h | Correr `test:fill` primero; verificar hora Colombia |
| Worker siempre llama al mismo candidato | `MAX_CONCURRENT_CALLS=1` y hay candidatos bloqueados | Aumentar el valor o correr `npm run limpiar` |
| Llamada real no suena | `ELEVENLABS_MOCK=true` en `.env` | Cambiar a `ELEVENLABS_MOCK=false` |
| El agente llama pero no habla | Variables dinámicas mal configuradas en ElevenLabs | Verificar que el agente usa `{{id}}`, `{{nombre}}`, etc. |
| Tabla `llamadas` no se actualiza tras la llamada | ElevenLabs no puede alcanzar el webhook | Verificar URL de ngrok en el dashboard de ElevenLabs |
| Worker bloqueado (slots llenos) | Llamadas mock antiguas en `EN_CURSO` | `npm run limpiar` para liberar los slots |
| ngrok deja de funcionar | Límite de sesión del plan gratuito | Reiniciar ngrok y actualizar la URL en ElevenLabs |
| `conversation_id` llega null | Error silencioso en la API de ElevenLabs | Revisar logs del servidor; verificar `ELEVENLABS_API_KEY` |

---

## ♻️ Flujo interno del sistema

```
[npm start / npm run dev]
         │
         ├──► Servidor HTTP :3000
         │         └──► POST /webhook/elevenlabs-resultado
         │
         ├──► Cron 07:00 ──► llenarColaParaFranja('manana')
         ├──► Cron 14:00 ──► llenarColaParaFranja('tarde')
         ├──► Cron 19:00 ──► llenarColaParaFranja('noche')
         │         └──► INSERT INTO cola_llamadas (PENDIENTE)
         │
         └──► Worker cada 10s
                   ├──► Cuenta EN_CURSO → si ya llegó al máximo, espera
                   ├──► Lee cola PENDIENTE de hoy (ORDER BY prioridad DESC)
                   ├──► Valida ventana horaria Colombia (06:00 – 22:00)
                   ├──► Valida horario del candidato (AM / PM / AMPM)
                   ├──► POST → API ElevenLabs (llamada saliente)
                   ├──► INSERT INTO llamadas (EN_CURSO)
                   └──► UPDATE cola_llamadas → ENCURSO

[ElevenLabs termina la llamada y envía webhook]
         └──► POST /webhook/elevenlabs-resultado
                   ├──► UPDATE llamadas  (resultado, dia_agendado, hora_agendado, nota)
                   ├──► UPDATE candidatos (estado_gestion, ultimo_contacto, evento_asignado_id)
                   ├──► UPDATE eventos   (inscritos_actuales; si lleno → estado = 'COMPLETO')
                   └──► UPDATE cola_llamadas → COMPLETADA / CANCELADA
```
