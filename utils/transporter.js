// src/utils/transporter.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Carga las variables de entorno

// Configura el transportador usando Gmail. Si usas otro servicio, ajusta host, puerto y secure.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Define esta variable en tu .env
    pass: process.env.EMAIL_PASS, // Define esta variable en tu .env
  },
});

module.exports = transporter;
