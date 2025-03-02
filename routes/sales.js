const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
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
    
    // Validar que cada item tenga product_id y que se provea club
    if (!items || !Array.isArray(items) || items.some(item => !item.product_id) || !club) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    // Crear la venta incluyendo el club y, si corresponde, el cliente
    const saleData = { items, total, status, club };
    if (client_id) saleData.client_id = client_id;
    if (clientTime && clientTimezone) {
      saleData.created_at = moment.tz(clientTime, clientTimezone).toDate();
      console.log('created_at', saleData.created_at);
    }
    const sale = new Sale(saleData);
    console.log('sale', sale);
    await sale.save();

    // Actualizar inventario para cada producto sellado filtrando por club
    for (const item of items) {
      if (item.type === 'sealed') {
        // Actualizar inventario
        await Inventory.findOneAndUpdate(
          { product_id: item.product_id, club },
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
        
        // Crear movimiento de inventario
        await InventoryMovement.create({
          club,
          product_id: item.product_id,
          type: 'purchase', // Tipo de movimiento para ventas
          quantity: -item.quantity, // Cantidad negativa porque sale del inventario
          notes: `Venta de producto - ID venta: ${sale._id}`,
          sale_price: item.price || 0
        });
      }
    }

    res.status(201).json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating sale' });
  }
});

module.exports = router;


