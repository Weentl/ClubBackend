// routes/sales.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

// GET /api/sales - Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching sales' });
  }
});

// POST /api/sales - Crear una nueva venta y actualizar inventario para productos sellados
router.post('/', async (req, res) => {
  try {
    const { items, total, status } = req.body;
    
    // Asegúrate de que cada item tenga product_id
    if (!items || !Array.isArray(items) || items.some(item => !item.product_id)) {
      return res.status(400).json({ message: 'Cada item debe tener un product_id válido.' });
    }

    // Crear la venta
    const sale = new Sale({ items, total, status });
    await sale.save();

    // Actualizar inventario para cada producto sellado
    for (const item of items) {
      if (item.type === 'sealed') {
        await Inventory.findOneAndUpdate(
          { product_id: item.product_id },
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
