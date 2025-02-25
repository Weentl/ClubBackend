// routes/clubs.js
const express = require('express');
const router = express.Router();
const Club = require('../models/Club');

// Endpoint para obtener los clubs asociados a un usuario
// Ejemplo: GET /api/clubs?user=<userId>
router.get('/', async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'El id del usuario es requerido' });
  }
  try {
    // Se ordena para que el club principal (isMain === true) aparezca primero
    const clubs = await Club.find({ user }).sort({ isMain: -1 });
    res.json(clubs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los clubs' });
  }
});

module.exports = router;
