// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

// Asegurarse de que la carpeta "uploads" exista
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configuración de multer para la carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/**
 * GET /api/users/:userId
 * Obtiene la información de la cuenta del usuario.
 */
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const responseData = {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      // Verificación de correo no implementada
      emailVerified: false,
    };

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * PATCH /api/users/:userId
 * Actualiza la información de la cuenta del usuario.
 * Se actualizan fullName, email y phone.
 */
router.patch('/:userId', async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    await user.save();
    res.json({ message: 'Información actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * POST /api/users/:userId/logo
 * Permite subir y actualizar la imagen de perfil del usuario.
 */
router.post('/:userId/logo', upload.single('logo'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    // Construir la URL de la imagen (asegúrate de que el servidor sirva la carpeta uploads)
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    user.profileImage = imageUrl;
    await user.save();

    res.json({ profileImage: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * POST /api/users/:userId/verify-email
 * Stub para la verificación de correo.
 */
router.post('/:userId/verify-email', (req, res) => {
  res.status(501).json({ error: 'La función de verificación de correo aún no está habilitada' });
});

module.exports = router;


