// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Club = require('../models/Club');
const moment = require('moment-timezone');

// Endpoint para obtener los KPIs del dashboard para un club específico
router.get('/kpis', async (req, res) => {
  const { club, timezone } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'El club es requerido' });
  }
  try {
    // Usar la zona horaria del cliente o UTC por defecto
    const tz = timezone || 'UTC';
    const now = moment.tz(tz);
    console.log('now', now);

    // Calcular inicio y fin del día en la zona horaria del cliente
    const startOfDay = now.clone().startOf('day').toDate();
    const endOfDay = now.clone().endOf('day').toDate();
    console.log('startOfDay', startOfDay);
    console.log('endOfDay', endOfDay); 

    // Ventas Hoy: suma de las ventas de hoy para el club
    const salesToday = await Sale.find({
      club,
      created_at: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log('salesToday', salesToday);
    const ventasHoy = salesToday.reduce((sum, sale) => sum + sale.total, 0);

    // Ganancias Mensuales: suma de las ventas del mes actual
    const startOfMonth = now.clone().startOf('month').toDate();
    const endOfMonth = now.clone().endOf('month').toDate();
    const salesMonth = await Sale.find({
      club,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const gananciasMensuales = salesMonth.reduce((sum, sale) => sum + sale.total, 0);

    // Productos Bajos en Stock: contar registros de inventario con cantidad menor a 5 para el club
    const productosBajosStock = await Inventory.countDocuments({
      club,
      quantity: { $lt: 5 }
    });

    // Clubs Activos: conteo global de clubs
    const clubsActivos = await Club.countDocuments({});

    res.json({
      ventasHoy,
      gananciasMensuales,
      productosBajosStock,
      clubsActivos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error calculando los KPIs' });
  }
});

module.exports = router;
