// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth'); // Asegúrate de tener el middleware de autenticación
const Club = require('../models/Club'); // Importamos el nuevo modelo


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
      isFirstLogin: true, // Nuevo campo
    });

    await user.save();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1hr' });

    res.status(201).json({ message: 'Usuario registrado correctamente.', 
      token, 
      user: {id: user._id, 
        fullName: user.fullName, 
        email: user.email, 
        businessType: user.businessType, 
        isFirstLogin: user.isFirstLogin
      }, 
    });
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
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    // Buscar el club principal del usuario
    const mainClub = await Club.findOne({ user: user._id, isMain: true });

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        businessType: user.businessType,
        isFirstLogin: user.isFirstLogin, // Nuevo campo
      },
      mainClub: mainClub ? {
        id: mainClub._id,
        clubName: mainClub.clubName,
        address: mainClub.address
      } : null
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

router.post('/onboarding', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { productTypes, mainClub, initialGoal, clubs } = req.body;

  // Validar campos requeridos: se requiere productTypes, initialGoal y mainClub (con nombre y dirección)
  if (!productTypes || !initialGoal || !mainClub || !mainClub.clubName || !mainClub.address) {
    return res.status(400).json({ message: 'Faltan campos requeridos del onboarding.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Actualizamos los datos del usuario (ya no se guarda la dirección en el usuario)
    user.productTypes = productTypes;
    user.initialGoal = initialGoal;
    user.isFirstLogin = false;
    await user.save();

    // Creamos el club principal
    const mainClubDoc = new Club({
      clubName: mainClub.clubName,
      address: mainClub.address,
      user: user._id,
      isMain: true
    });
    await mainClubDoc.save();

    // Creamos los clubes adicionales (si los hay)
    if (clubs && Array.isArray(clubs) && clubs.length > 0) {
      for (const clubData of clubs) {
        // Validamos que se haya ingresado un nombre (opcionalmente se podría validar la dirección también)
        if (clubData.clubName && clubData.clubName.trim() !== '') {
          const club = new Club({
            clubName: clubData.clubName,
            address: clubData.address,
            user: user._id,
            isMain: false
          });
          console.log('Club:', club);
          await club.save();
        }
      }
    }

    res.json({ message: 'Onboarding completado correctamente.' });
  } catch (error) {
    console.error('Error al guardar el onboarding:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
