// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); // Importa cors
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory'); // Importa las rutas de inventario
const salesRoutes = require('./routes/sales'); // Nuevo endpoint de ventas
const dashboardRoutes = require('./routes/dashboard'); // Importa las rutas del dashboard
const clubsRoutes = require('./routes/clubs'); // Importa las rutas de los clubs
const clientsRoutes = require('./routes/clients'); // Importa las rutas de los clientes
const employeeRoutes = require('./routes/employees');
const reportsRoutes = require('./routes/reports'); // Importa el endpoint de reportes
const expensesRoutes = require('./routes/expenses'); // Importa las rutas de gastos
const userRoutes = require('./routes/userRoutes');


const app = express();


// Habilitar CORS para todos los orígenes (puedes restringirlo en producción)
app.use(cors({
  origin: ['https://myadclub.netlify.app', 'http://localhost:3000'], // Add any other origins you need
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add a pre-flight handler for OPTIONS requests
app.options('*', cors());

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose
  .connect('mongodb+srv://Glowel:zujNCzJxnjuSsx3A@myclub.v10xz.mongodb.net/?retryWrites=true&w=majority&appName=MyClub', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes); // <-- Agrega el endpoint para inventario
app.use('/api/sales', salesRoutes); // Agregamos la ruta de ventas
app.use('/api/dashboard', dashboardRoutes); // Agregamos la ruta del dashboard
app.use('/api/clubs', clubsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/reports', reportsRoutes); // Registrar la ruta de reportes
app.use('/api/employees', employeeRoutes);
app.use('/api/expenses', expensesRoutes); // Agrega la ruta de gastos
app.use('/api/users', userRoutes);



// Puerto de escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

