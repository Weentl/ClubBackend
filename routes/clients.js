const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Sale = require('../models/Sale'); // Si manejas ventas

// Obtener todos los clientes filtrando por club_id si se proporciona
router.get('/', async (req, res) => {
  try {
    const { club_id } = req.query;
    const query = club_id ? { club_id } : {};
    const clients = await Client.find(query);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Obtener un cliente por ID (aquí se asume que ya se validó que el cliente pertenece al club)
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el cliente' });
  }
});

// Crear un nuevo cliente (se espera que el body incluya club_id o se agregue acá)
router.post('/', async (req, res) => {
  try {
    // Se puede forzar el club_id si se tiene disponible en el usuario autenticado
    const clientData = req.body;
    if (!clientData.club_id) {
      return res.status(400).json({ error: 'El club_id es obligatorio' });
    }
    const client = new Client(clientData);
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el cliente' });
  }
});

// Actualizar un cliente
router.patch('/:id', async (req, res) => {
  try {
    const clientData = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, clientData, { new: true });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
});

// Obtener las ventas de un cliente (si aplicas ventas)
router.get('/:id/sales', async (req, res) => {
  try {
    const sales = await Sale.find({ client_id: req.params.id });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las ventas del cliente' });
  }
});

module.exports = router;

