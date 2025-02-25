// routes/inventory.js
const express = require('express');
const router = express.Router();
const InventoryMovement = require('../models/InventoryMovement');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');


// Endpoint para realizar un ajuste de inventario
// POST /api/inventory/adjust
router.post('/adjust', async (req, res) => {
  const { product_id, type, quantity, notes, purchase_price, sale_price, update_catalog_price } = req.body;
  if (!product_id || !type || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    // Crear el movimiento de inventario
    const movement = await InventoryMovement.create({
      product_id,
      type,
      quantity,
      notes,
      purchase_price,
      sale_price
    });

    // Si se requiere actualizar los precios en el catálogo, actualizamos el producto
    if (update_catalog_price) {
      await Product.findByIdAndUpdate(product_id, {
        purchase_price,
        sale_price
      });
    }

    // Actualizar (o crear) el registro de inventario
    let inventory = await Inventory.findOne({ product_id });
    if (inventory) {
      inventory.quantity += quantity;
      await inventory.save();
    } else {
      inventory = await Inventory.create({ product_id, quantity });
    }

    res.json({ movement, inventory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener el historial de movimientos de un producto
// GET /api/inventory/movements/:productId
router.get('/movements/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const movements = await InventoryMovement.find({ product_id: productId }).sort({ created_at: -1 });
    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener el inventario (cantidad actual por producto)
// GET /api/inventory
router.get('/', async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
