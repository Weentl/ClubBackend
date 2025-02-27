// routes/sales.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const moment = require('moment-timezone');

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
    const { items, total, status, club, clientTime, clientTimezone, client_id } = req.body;
    console.log('clientTime:', clientTime);
    console.log('time', clientTimezone);
    
    // Se valida que cada item tenga product_id y se requiere club
    if (!items || !Array.isArray(items) || items.some(item => !item.product_id) || !club) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    // Crear la venta incluyendo el club
    const saleData = { items, total, status, club };
    if (client_id) saleData.client_id = client_id;
    if (clientTime && clientTimezone) {
      if (clientTime && clientTimezone) {
        // Usar el nombre correcto created_at (con guion bajo)
        saleData.created_at = moment.tz(clientTime, clientTimezone).toDate();
        console.log('created_at', saleData.created_at);
      }
    }
    const sale = new Sale(saleData);
    console.log('sale', sale);
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

