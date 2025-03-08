const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const Employee = require('../models/Employee');
const Club = require('../models/Club');
const User = require('../models/User'); // Importa el modelo de User

// Configuración de multer para almacenar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Asegúrate de que la carpeta "uploads" exista
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// Obtener empleados por club
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const employees = await Employee.find({ club: clubId });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// Crear empleado – se asocia al club actual, se registra quién lo crea y se procesa la imagen
// Se agrega el middleware upload.single('photo') para procesar el campo "photo" del FormData
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    // Los datos enviados en FormData se encuentran en req.body y la imagen en req.file
    const { name, role, phone, email, club, permissions } = req.body;

    console.log('Datos del empleado:', req.body);
    // Asegúrate de que el middleware de autenticación haya asignado el id del dueño
    // Por ejemplo, si el middleware asigna req.user o req.userId, usa ese valor.
    // Aquí usaremos req.userId suponiendo que el middleware lo coloca correctamente.
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const clubExists = await Club.findOne({ _id: club, user: req.userId });
    if (!clubExists) {
      return res.status(404).json({ error: 'Club no encontrado o no autorizado' });
    }

    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Construir la URL de la imagen, si se envió
    let image_url = '';
    if (req.file) {
      image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Crear el empleado
    const newEmployee = new Employee({ 
      name, 
      role, 
      phone, 
      email, 
      club, 
      image_url,
      permissions: JSON.parse(permissions || '[]'),
      password: hashedPassword, // Contraseña cifrada
      created_by: req.userId 
    });

    // En caso de que se procese una imagen, puedes asignar otra propiedad para la foto
    if (req.file) {
      newEmployee.photo_url = `/uploads/${req.file.filename}`;
    }

    await newEmployee.save();


    res.status(201).json({ 
      user_code: newEmployee._id, 
      temp_password: tempPassword, 
      message: 'Empleado creado con éxito'
    });

  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ error: error.message || 'Error al crear empleado' });
  }
});

// Actualizar empleado
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedEmployee = await Employee.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// Eliminar empleado
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

router.post('/:id/change-password', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: 'La nueva contraseña es requerida.' });
  }

  try {
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    // Opcional: verifica que el usuario autenticado tenga permisos para cambiar la contraseña de este empleado.
    // Por ejemplo, podrías comparar req.userId con employee.created_by o aplicar otra lógica de autorización.

    // Cifrar la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    employee.isFirstLogin = false; // Marcar que ya no es el primer login
    await employee.save();


    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar la contraseña del empleado:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;



