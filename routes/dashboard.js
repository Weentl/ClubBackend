// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Club = require('../models/Club');
const Expense = require('../models/Expense');
const moment = require('moment-timezone');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Endpoint para obtener los KPIs del dashboard para un club específico
router.get('/kpis', async (req, res) => {
  const { club, timezone, user } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'El club es requerido' });
  }
  try {
    // Usar UTC para consultas de fechas para evitar problemas de zona horaria
    const now = moment.utc();
    const nowSale = moment.tz('America/Mexico_City');
    
    // Calcular inicio y fin del día en UTC
    const startOfDay = nowSale.clone().startOf('day').toDate();
    const endOfDay = nowSale.clone().endOf('day').toDate();
    
    console.log('startOfDay', startOfDay);
    console.log('endOfDay', endOfDay);
    // Ventas Hoy: suma de las ventas de hoy para el club
    const salesToday = await Sale.find({
      club,
      created_at: { $gte: startOfDay, $lte: endOfDay }
    });
    const ventasHoy = salesToday.reduce((sum, sale) => sum + sale.total, 0);
    
    // Calcular el periodo del mes actual en UTC
    const startOfMonth = now.clone().startOf('month').toDate();
    const endOfMonth = now.clone().endOf('month').toDate();
    
    // Ventas del mes: usar "created_at"
    const salesMonth = await Sale.find({
      club,
      created_at: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlySales = salesMonth.reduce((sum, sale) => sum + sale.total, 0);
    
    // Gastos del mes: usar fecha en UTC para evitar problemas de zonas horarias
    const expensesMonth = await Expense.find({
      club,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlyExpenses = expensesMonth.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Ganancias Mensuales Netas: ventas menos gastos
    const gananciasMensuales = monthlySales - monthlyExpenses;
    
    // Productos Bajos en Stock: contar registros de inventario con cantidad menor a 5 para el club
    const productosBajosStock = await Inventory.countDocuments({
      club,
      quantity: { $lt: 5 }
    });
    
    // Clubs Activos: conteo global de clubs
    const clubsActivos = await Club.countDocuments({ user });
    
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


router.get('/chart-data', async (req, res) => {
  const { club, chartType, timePeriod } = req.query;
  if (!club || !chartType || !timePeriod) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: club, chartType y timePeriod' });
  }
  
  try {
    // Definir el rango de fechas basado en el timePeriod y usando UTC
    const now = moment.utc();
    let startDate, endDate;
    
    endDate = now.clone().endOf('day').toDate();
    if (timePeriod === '7d') {
      startDate = now.clone().subtract(6, 'days').startOf('day').toDate();
    } else if (timePeriod === '1m') {
      startDate = now.clone().startOf('month').toDate();
      endDate = now.clone().endOf('month').toDate();
    } else if (timePeriod === '1y') {
      startDate = now.clone().startOf('year').toDate();
      endDate = now.clone().endOf('year').toDate();
    } else {
      return res.status(400).json({ error: 'timePeriod inválido. Use 7d, 1m o 1y' });
    }
    
    if (chartType === 'Ventas vs. Gastos') {
      // Para cada día en el rango, calcular ventas y gastos
      const days = [];
      const current = moment.utc(startDate);
      const end = moment.utc(endDate);
      
      while (current <= end) {
        days.push(current.format('YYYY-MM-DD'));
        current.add(1, 'day');
      }
      
      const salesArray = [];
      const expensesArray = [];
      
      // Recorrer cada día para acumular los valores
      for (let day of days) {
        const dayStart = moment.utc(day).startOf('day').toDate();
        const dayEnd = moment.utc(day).endOf('day').toDate();
        
        // Ventas del día
        const dailySalesDocs = await Sale.find({
          club,
          created_at: { $gte: dayStart, $lte: dayEnd }
        });
        const dailySales = dailySalesDocs.reduce((sum, sale) => sum + sale.total, 0);
        
        // Gastos del día - Aseguramos que usamos UTC para consistencia con fechas almacenadas
        const dailyExpensesDocs = await Expense.find({
          club,
          date: { $gte: dayStart, $lte: dayEnd }
        });
        const dailyExpenses = dailyExpensesDocs.reduce((sum, expense) => sum + expense.amount, 0);
        
        salesArray.push(dailySales);
        expensesArray.push(dailyExpenses);
      }
      
      res.json({
        labels: days,
        sales: salesArray,
        expenses: expensesArray
      });
      
    } else if (chartType === 'Productos Más Vendidos') {
      // Usar agregación para obtener los productos más vendidos en el periodo seleccionado
      const salesData = await Sale.aggregate([
        {
          $match: {
            club: mongoose.Types.ObjectId(club),
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product_id',
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            _id: 0,
            productName: '$product.name',
            totalSold: 1
          }
        }
      ]);
      const labels = salesData.map(item => item.productName);
      const values = salesData.map(item => item.totalSold);
      res.json({ labels, values });
      
    } else {
      return res.status(400).json({ error: 'chartType inválido' });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener datos del gráfico' });
  }
});

// ------------------------------
// Endpoint para actualizar (editar) la meta del negocio
// PUT /api/dashboard/business-goals
// Body: { club: <clubId>, sales_goal: <nueva meta> }
// ------------------------------
router.put('/business-goals', async (req, res) => {
  const { club, sales_goal } = req.body;
  if (!club || sales_goal === undefined) {
    return res.status(400).json({ error: 'El club y la meta (sales_goal) son requeridos' });
  }
  try {
    const updatedClub = await Club.findByIdAndUpdate(club, { sales_goal }, { new: true });
    if (!updatedClub) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    res.json({
      message: 'Meta actualizada correctamente',
      sales_goal: updatedClub.sales_goal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la meta' });
  }
});

router.get('/business-goals', async (req, res) => {
  const { club } = req.query;
  if (!club) {
    return res.status(400).json({ error: 'El club es requerido' });
  }
  
  try {
    // Buscar el club en la base de datos
    const clubData = await Club.findById(club);
    if (!clubData) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    // Calcular inicio y fin del mes actual usando UTC
    const now = moment.utc();
    const startOfMonth = now.clone().startOf('month').toDate();
    const endOfMonth = now.clone().endOf('month').toDate();
    
    // Obtener las ventas del mes para el club
    const sales = await Sale.find({
      club,
      created_at: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlySales = sales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Obtener los gastos del mes para el club usando UTC para consistencia
    const expenses = await Expense.find({
      club,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlyExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calcular el beneficio neto (ventas menos gastos)
    const netProfit = monthlySales - monthlyExpenses;
    
    // La meta se obtiene desde el club (sales_goal)
    const target = clubData.sales_goal;
    
    res.json({
      description: 'Meta mensual de ventas netas',
      target,
      progress: netProfit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la meta del negocio' });
  }
});

module.exports = router;