// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); // Importa cors
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');

const app = express();

// Habilitar CORS para todos los orígenes (puedes restringirlo en producción)
app.use(cors());

// Middlewares
app.use(express.json());

// Servir archivos estáticos desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose
  .connect('mongodb://localhost:27019/plataformaDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);

// Puerto de escucha
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

