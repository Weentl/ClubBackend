// routes/sales.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

// GET /api/sales - Obtener todas las ventas filtradas por club si se proporciona
router.get('/', async (req, res) => {
  const { club } = req.query;
  try {
    const filter = {};
    if (club) {
      filter.club = club;
    }
    const sales = await Sale.find(filter);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching sales' });
  }
});

// POST /api/sales - Crear una nueva venta y actualizar inventario para productos sellados
router.post('/', async (req, res) => {
  try {
    const { items, total, status, club } = req.body;
    
    // Se valida que cada item tenga product_id y se requiere club
    if (!items || !Array.isArray(items) || items.some(item => !item.product_id) || !club) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    // Crear la venta incluyendo el club
    const sale = new Sale({ items, total, status, club });
    await sale.save();

    // Actualizar inventario para cada producto sellado filtrando por club
    for (const item of items) {
      if (item.type === 'sealed') {
        await Inventory.findOneAndUpdate(
          { product_id: item.product_id, club },
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }
    }

    res.status(201).json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating sale' });
  }
});

module.exports = router;

