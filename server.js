const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const authMiddleware = require('./middleware/auth'); // Asegúrate de tener este middleware
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const clubsRoutes = require('./routes/clubs');
const clientsRoutes = require('./routes/clients');
const employeeRoutes = require('./routes/employees');
const reportsRoutes = require('./routes/reports');
const expensesRoutes = require('./routes/expenses');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();

// Configurar CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

// Middlewares para manejo de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Rutas públicas (sin protección)
app.use('/api/auth', authRoutes);
app.use('/api/products', 
  authMiddleware, 
  express.json(), // Aplica sólo a rutas que necesiten JSON
  productsRoutes
);
app.use('/api/employees', authMiddleware,express.json(), employeeRoutes);

// Rutas protegidas: se añade el middleware de autenticación para validar el token
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/clubs', authMiddleware, clubsRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/employees', authMiddleware, employeeRoutes);
app.use('/api/expenses', authMiddleware, expensesRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// Puerto de escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


if (process.env.PUBLIC_URL) {
  const protocol = process.env.PUBLIC_URL.startsWith('https') ? require('https') : require('http');
  setInterval(() => {
    protocol.get(process.env.PUBLIC_URL, (res) => {
      console.log(`Self ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Error en el self ping:', err.message);
    });
  }, 300000); // 300000 ms = 5 minutos
}