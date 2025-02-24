// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Clave secreta para JWT (en producción, usa variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

// Endpoint de registro
router.post('/register', async (req, res) => {
  const { fullName, email, password, businessType, acceptedTerms } = req.body;

  if (!fullName || !email || !password || acceptedTerms !== true) {
    return res.status(400).json({ message: 'Faltan campos requeridos.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      businessType,
      acceptedTerms,
    });

    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Endpoint de login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas.' });

    // Genera un token JWT (válido por 1 día)
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        businessType: user.businessType,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Endpoint de logout
// En una autenticación stateless con JWT, el logout se maneja eliminando el token en el cliente.
// Si deseas invalidar tokens, deberías implementar una blacklist.
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente.' });
});

// Endpoint para solicitar reseteo de contraseña
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'El email es requerido.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });

    // Genera un código de 6 dígitos y lo guarda con expiración (15 minutos)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date(Date.now() + 15 * 60 * 1000);

    user.resetCode = resetCode;
    user.resetCodeExpiration = expiration;
    await user.save();

    // En producción, aquí enviarías el código por email.
    // Para pruebas locales devolvemos el código en la respuesta.
    res.json({ message: 'Código de reseteo generado.', resetCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Endpoint para actualizar la contraseña usando el código de reseteo
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Faltan campos requeridos.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });

    // Verifica que el código coincida y no esté expirado
    if (user.resetCode !== code || user.resetCodeExpiration < new Date()) {
      return res.status(400).json({ message: 'Código inválido o expirado.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpiration = undefined;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
