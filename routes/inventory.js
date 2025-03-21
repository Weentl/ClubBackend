// routes/inventory.js
const express = require('express');
const router = express.Router();
const InventoryMovement = require('../models/InventoryMovement');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// Endpoint para realizar un ajuste de inventario
// POST /api/inventory/adjust
router.post('/adjust', async (req, res) => {
  const { product_id, type, quantity, notes, purchase_price, sale_price, update_catalog_price, club } = req.body;
  
  // Se valida que se hayan enviado los campos requeridos, incluyendo el club
  if (!product_id || !type || typeof quantity !== 'number' || !club) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Crear el movimiento de inventario, asociándolo al club
    const movement = await InventoryMovement.create({
      product_id,
      type,
      quantity,
      notes,
      purchase_price,
      sale_price,
      club,
    });

    // Si se requiere actualizar los precios en el catálogo, actualizamos el producto
    if (update_catalog_price) {
      await Product.findByIdAndUpdate(product_id, {
        purchase_price,
        sale_price,
      });
    }

    // Actualizar (o crear) el registro de inventario para el club indicado
    let inventory = await Inventory.findOne({ product_id, club });
    if (inventory) {
      inventory.quantity += quantity;
      await inventory.save();
    } else {
      inventory = await Inventory.create({ product_id, quantity, club });
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
  // Se puede enviar el club como query parameter para filtrar movimientos por club
  const { club } = req.query;
  const filter = { product_id: productId };
  if (club) {
    filter.club = club;
  }
  try {
    const movements = await InventoryMovement.find(filter).sort({ created_at: -1 });
    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener el inventario (cantidad actual por producto) filtrado por club
// GET /api/inventory
router.get('/', async (req, res) => {
  const { club } = req.query;
  try {
    const filter = {};
    if (club) {
      filter.club = club;
    }
    const inventory = await Inventory.find(filter);
    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/low-stock', async (req, res) => {
  const { club, threshold } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'El club es requerido' });
  }
  // Se utiliza 5 como umbral por defecto, pero se puede enviar otro valor mediante el query parameter "threshold"
  const stockThreshold = threshold ? parseInt(threshold) : 5;
  try {
    // Se busca el inventario del club con cantidad menor al umbral
    const lowStockItems = await Inventory.find({ club, quantity: { $lt: stockThreshold } })
      .populate('product_id', 'name'); // Se asume que se desea el nombre del producto
    res.json(lowStockItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// PATCH /api/inventory/movements/:movementId
router.patch('/movements/:movementId', async (req, res) => {
  const { movementId } = req.params;
  const { type, quantity, notes } = req.body;
  const club = req.body.club || req.query.club; // Permitir club en body o query
  if (!club) {
    return res.status(400).json({ error: 'Club es requerido' });
  }
  try {
    const movement = await InventoryMovement.findById(movementId);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    // Calcula la diferencia en cantidad para ajustar el inventario
    const quantityDiff = quantity - movement.quantity;
    movement.type = type || movement.type;
    movement.quantity = quantity;
    movement.notes = notes;
    await movement.save();

    // Actualizar el inventario del club
    const inventory = await Inventory.findOne({ product_id: movement.product_id, club });
    if (inventory) {
      inventory.quantity += quantityDiff;
      await inventory.save();
    }
    res.json({ movement, inventory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para eliminar un movimiento
// DELETE /api/inventory/movements/:movementId
router.delete('/movements/:movementId', async (req, res) => {
  const { movementId } = req.params;
  const { club } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'Club es requerido' });
  }
  try {
    const movement = await InventoryMovement.findById(movementId);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    // Actualizar el inventario: se resta la cantidad del movimiento eliminado
    const inventory = await Inventory.findOne({ product_id: movement.product_id, club });
    if (inventory) {
      inventory.quantity -= movement.quantity;
      await inventory.save();
    }
    await movement.remove();
    res.json({ message: 'Movimiento eliminado', inventory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


module.exports = router;

