// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Club = require('../models/Club');

// Endpoint para obtener los KPIs del dashboard para un club específico
router.get('/kpis', async (req, res) => {
  const { club } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'El club es requerido' });
  }
  try {
    // Ventas Hoy: suma de las ventas de hoy para el club
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const salesToday = await Sale.find({
      club,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    const ventasHoy = salesToday.reduce((sum, sale) => sum + sale.total, 0);

    // Ganancias Mensuales: suma de las ventas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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

    // Clubs Activos: aquí se puede contar todos los clubs o filtrar por usuario; se usa un conteo global para este ejemplo
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
