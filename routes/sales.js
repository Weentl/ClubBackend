const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const moment = require('moment-timezone');
const Employee = require('../models/Employee'); // Modelo de empleados
const User = require('../models/User'); // Modelo de usuarios

// GET /api/sales - Obtener todas las ventas filtradas por club si se proporciona
router.get('/', async (req, res) => {
  const { club, employee } = req.query;
  const userId = req.userId ? req.userId : null;
  let filter = {};
  if (club) {
    filter.club = club;
  }

  if (userId) {
    // Verificamos si el usuario autenticado es un empleado
    const empRecord = await Employee.findById(userId);
    if (empRecord) {
      // Si es empleado, solo se muestran sus ventas
      filter.created_by = userId;
      console.log('empRecord', empRecord);
    } else {
      // Si es dueño, se muestran todas las ventas del club.
      // Si se pasa el parámetro employee, se filtran las ventas por el nombre del empleado.
      if (employee) {
        const matchingEmployees = await Employee.find({
          club: club,
          name: { $regex: employee, $options: 'i' }
        });
        const employeeIds = matchingEmployees.map(emp => emp._id);
        if (employeeIds.length > 0) {
          filter.created_by = { $in: employeeIds };
        } else {
          // Si no se encuentra ningún empleado que coincida, se fuerza un filtro sin resultados.
          filter.created_by = null;
        }
      }
    }
  }
  

  try {
    // Populamos el campo created_by con el nombre para que el dueño vea quién creó la venta
    const sales = await Sale.find(filter).populate('created_by', 'name');
    console.log('sales', sales);
    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: 'Error fetching sales' });
  }
});

// POST /api/sales - Crear una nueva venta y actualizar inventario para productos sellados
router.post('/', async (req, res) => {
  try {
    const { items, total, status, club, clientTime, clientTimezone, client_id } = req.body;
    console.log('clientTime:', clientTime);
    console.log('time:', clientTimezone);

    const userId = req.userId ? req.userId : null;
    console.log('userId:', userId);
    // Validar que cada item tenga product_id y que se provea club
    if (!items || !Array.isArray(items) || items.some(item => !item.product_id) || !club) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }
    
    // Obtener el nombre del usuario (empleado o dueño) que crea la venta
    let creatorName = 'Desconocido';
  if (userId) {
    // Intentar buscar en la colección de empleados
    let userRecord = await Employee.findById(userId);
    if (userRecord && userRecord.name) {
      creatorName = userRecord.name;
    } else {
      // Si no es un empleado, buscar en la colección de usuarios (dueños)
      userRecord = await User.findById(userId);
      if (userRecord && userRecord.fullName) {
        creatorName = userRecord.fullName;
        console.log('creatorName:', creatorName);
      }
    }
  }

    // Crear la venta incluyendo el club, el usuario que la crea y, si corresponde, el cliente
    const saleData = { 
      items, 
      total, 
      status, 
      club, 
      created_by: userId, 
      created_by_name: creatorName  // Se agrega el nombre del creador
    };
    
    if (client_id) saleData.client_id = client_id;
    if (clientTime && clientTimezone) {
      saleData.created_at = moment.tz(clientTime, clientTimezone).toDate();
      console.log('created_at:', saleData.created_at);
    }
    
    const sale = new Sale(saleData);
    console.log('sale:', sale);
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


