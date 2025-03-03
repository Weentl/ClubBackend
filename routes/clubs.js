// routes/clubs.js
const express = require('express');
const router = express.Router();
const Club = require('../models/Club');

// Obtener clubs asociados a un usuario
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

// Crear un nuevo club
router.post('/', async (req, res) => {
  try {
    const clubData = req.body;
    // Se asume que en clubData se envía el id del usuario (o se puede obtener de la sesión)
    const newClub = new Club(clubData);
    await newClub.save();
    res.status(201).json(newClub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el club' });
  }
});

// Actualizar un club existente por su id
router.put('/:id', async (req, res) => {
  if (req.body.name) {
    req.body.clubName = req.body.name;
    delete req.body.name;
  }
  try {
    const updatedClub = await Club.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedClub) return res.status(404).json({ error: 'Club no encontrado' });
    res.json(updatedClub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el club' });
  }
});

// Eliminar un club
router.delete('/:id', async (req, res) => {
  try {
    const deletedClub = await Club.findByIdAndDelete(req.params.id);
    if (!deletedClub) return res.status(404).json({ error: 'Club no encontrado' });
    res.json({ message: 'Club eliminado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el club' });
  }
});

module.exports = router;

