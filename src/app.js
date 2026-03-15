// src/app.js

'use strict';

const express = require('express');
const cors = require('cors');

const chatbotRoutes = require('./routes/chatbot.routes');
const adminRoutes = require('./routes/admin.routes');
const healthRoutes = require('./routes/health');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// ── Rutas ────────────────────────────────────
app.use('/api/health', healthRoutes);   // Endpoint de estado
app.use('/api/chatbot', chatbotRoutes); // Ruta principal del Bot
app.use('/api/admin', adminRoutes);     // Panel de Control
app.use(express.static(path.join(__dirname, '../public'))); // Frontend

// Handler 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app;
