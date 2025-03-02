// routes/reports.js
const express = require('express');
const moment = require('moment');
const router = express.Router();
const mongoose = require('mongoose');
// Importar modelos
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const Club = require('../models/Club');
// Se pueden importar otros modelos (Client, Inventory, etc.) según sea necesario

/**
 * Reporte Ejecutivo:
 * Calcula ganancias netas, top producto, mayor gasto y club líder a partir de las ventas y gastos.
 */
async function getExecutiveSummary(period, club) {
  const mexicoTz = "America/Mexico_City";
  const now = moment.tz(mexicoTz);
  let startDate, endDate;
  if (period === 'weekly') {
    startDate = now.clone().startOf('isoWeek');
    endDate = now.clone().endOf('isoWeek');
  } else if (period === 'monthly') {
    startDate = now.clone().startOf('month');
    endDate = now.clone().endOf('month');
  } else {
    startDate = now.clone().startOf('year');
    endDate = now.clone().endOf('year');
  }
  
  const salesStartDate = startDate.toDate();
  const salesEndDate = endDate.toDate();
  const expenseStartDate = moment.utc(salesStartDate).add(-1, 'day').startOf('day').toDate();
  const expenseEndDate = moment.utc(salesEndDate).add(-1, 'day').endOf('day').toDate();


  // Agregar el filtro de club si se proporciona
  let salesMatch = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };
  let expenseMatch = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };
  if (club) {
    salesMatch.club = mongoose.Types.ObjectId(club);
    expenseMatch.club = club; // Asumiendo que Expense también posee el campo club
  }

  // Total de ventas
  const salesAgg = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: null, totalSales: { $sum: "$total" } } }
  ]);
  const totalSales = salesAgg.length ? salesAgg[0].totalSales : 0;

  // Total de gastos
  const expensesAgg = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: null, totalExpenses: { $sum: "$amount" } } }
  ]);
  const totalExpenses = expensesAgg.length ? expensesAgg[0].totalExpenses : 0;

  const netProfit = totalSales - totalExpenses;

  // Período anterior
  let prevStart, prevEnd;
  if (period === 'weekly') {
    prevStart = startDate.clone().subtract(1, 'week');
    prevEnd = endDate.clone().subtract(1, 'week');
  } else if (period === 'monthly') {
    prevStart = startDate.clone().subtract(1, 'month');
    prevEnd = endDate.clone().subtract(1, 'month');
  } else {
    prevStart = startDate.clone().subtract(1, 'year');
    prevEnd = endDate.clone().subtract(1, 'year');
  }
  const prevSalesStart = prevStart.toDate();
  const prevSalesEnd = prevEnd.toDate();
  const prevExpenseStart = moment.utc(prevSalesStart).add(1, 'day').startOf('day').toDate();
  const prevExpenseEnd = moment.utc(prevSalesEnd).add(1, 'day').endOf('day').toDate();

  let prevSalesMatch = { created_at: { $gte: prevSalesStart, $lte: prevSalesEnd } };
  let prevExpenseMatch = { date: { $gte: prevExpenseStart, $lte: prevExpenseEnd } };
  if (club) {
    prevSalesMatch.club = club;
    prevExpenseMatch.club = club;
  }
  
  const prevSalesAgg = await Sale.aggregate([
    { $match: prevSalesMatch },
    { $group: { _id: null, totalSales: { $sum: "$total" } } }
  ]);
  const prevTotalSales = prevSalesAgg.length ? prevSalesAgg[0].totalSales : 0;

  const prevExpensesAgg = await Expense.aggregate([
    { $match: prevExpenseMatch },
    { $group: { _id: null, totalExpenses: { $sum: "$amount" } } }
  ]);
  const prevTotalExpenses = prevExpensesAgg.length ? prevExpensesAgg[0].totalExpenses : 0;
  const prevNetProfit = prevTotalSales - prevTotalExpenses;
  const netProfitChange = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;

  // Producto estrella
  let topProductAgg = await Sale.aggregate([
    { $match: salesMatch },
    { $unwind: "$items" },
    { $group: { _id: "$items.product_id", totalQuantity: { $sum: "$items.quantity" } } },
    { $sort: { totalQuantity: -1 } },
    { $limit: 1 }
  ]);
  let topProduct = { name: 'N/A', sales: 0, percentage: 0 };
  if (topProductAgg.length) {
    const product = await Product.findById(topProductAgg[0]._id);
    if (product) {
      const totalProductAgg = await Sale.aggregate([
        { $match: salesMatch },
        { $unwind: "$items" },
        { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } }
      ]);
      const totalProductQuantity = totalProductAgg.length ? totalProductAgg[0].totalQuantity : 0;
      const percentage = totalProductQuantity > 0 ? (topProductAgg[0].totalQuantity / totalProductQuantity) * 100 : 0;
      topProduct = {
        name: product.name,
        sales: topProductAgg[0].totalQuantity,
        percentage
      };
    }
  }

  // Mayor gasto
  const topExpenseDoc = await Expense.findOne(expenseMatch).sort({ amount: -1 });
  let topExpense = { name: 'N/A', amount: 0, percentage: 0 };
  if (topExpenseDoc) {
    const percentage = totalExpenses > 0 ? (topExpenseDoc.amount / totalExpenses) * 100 : 0;
    topExpense = {
      name: topExpenseDoc.category,
      amount: topExpenseDoc.amount,
      percentage
    };
  }

  // Club líder (solo se aplica en el modo global si no se filtró; de lo contrario se muestra el club seleccionado)
  let topClub = { name: 'N/A', sales: 0, percentage: 0 };
  if (!club) {
    const topClubAgg = await Sale.aggregate([
      { $match: salesMatch },
      { $group: { _id: "$club", totalSales: { $sum: "$total" } } },
      { $sort: { totalSales: -1 } },
      { $limit: 1 }
    ]);
    if (topClubAgg.length) {
      const clubDoc = await Club.findById(topClubAgg[0]._id);
      if (clubDoc) {
        const percentage = totalSales > 0 ? (topClubAgg[0].totalSales / totalSales) * 100 : 0;
        topClub = {
          name: clubDoc.clubName || clubDoc.name,
          sales: topClubAgg[0].totalSales,
          percentage
        };
      }
    }
  } else {
    // Si se filtró por club, se asigna ese club como líder
    const clubDoc = await Club.findById(club);
    if (clubDoc) {
      topClub = {
        name: clubDoc.clubName || clubDoc.name,
        sales: totalSales,
        percentage: 100
      };
    }
  }

  const recommendations = [
    { id: 1, text: `Aumenta el stock de ${topProduct.name}`, type: 'positive' },
    { id: 2, text: 'Revisa tus gastos en servicios', type: 'negative' },
    { id: 3, text: 'Considera promociones para aumentar ventas', type: 'neutral' }
  ];

  return {
    netProfit,
    netProfitChange,
    topProduct,
    topExpense,
    topClub,
    recommendations,
    totalSales,
    totalExpenses,
    period: `${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`
  };
}

/**
 * Reporte de Flujo de Caja:
 * Agrega ventas y gastos diarios para formar el flujo.
 */
async function getCashFlow(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  
  const salesDaily = await Sale.aggregate([
    { $match: { created_at: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, total: { $sum: "$total" } } }
  ]);
  const expensesDaily = await Expense.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } }
  ]);
  
  const cashFlowMap = {};
  salesDaily.forEach(item => {
    cashFlowMap[item._id] = { inflow: item.total, outflow: 0 };
  });
  expensesDaily.forEach(item => {
    if (cashFlowMap[item._id]) {
      cashFlowMap[item._id].outflow = Math.abs(item.total);
    } else {
      cashFlowMap[item._id] = { inflow: 0, outflow: Math.abs(item.total) };
    }
  });
  
  const days = [];
  const currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate, 'day')) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const inflow = cashFlowMap[dateStr] ? cashFlowMap[dateStr].inflow : 0;
    const outflow = cashFlowMap[dateStr] ? cashFlowMap[dateStr].outflow : 0;
    days.push({ date: dateStr, inflow, outflow, balance: inflow - outflow });
    currentDate.add(1, 'day');
  }
  
  // Los siguientes valores pueden obtenerse de otras fuentes o cálculos
  const currentBalance = 5000;
  const next7DaysOutflow = 1200;
  
  return { currentMonth: moment(now).format("MMMM YYYY"), cashFlowData: days, currentBalance, next7DaysOutflow };
}

/**
 * Reporte de Desempeño por Club:
 * Agrupa ventas por club y junta datos del Club.
 */
async function getClubPerformance(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  
  const clubsAgg = await Sale.aggregate([
    { $match: { created_at: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$club", totalSales: { $sum: "$total" } } },
    { $sort: { totalSales: -1 } }
  ]);
  
  const clubsData = await Promise.all(clubsAgg.map(async item => {
    const club = await Club.findById(item._id).lean();
    return club ? {
      id: club._id,
      name: club.clubName || club.name,
      address: club.address,
      sales: item.totalSales,
      expenses: 0, // Podrías agregar una agregación de gastos para cada club
      profit: item.totalSales, // Simplificado
      employees: club.employee_count || 0,
      customers: 0,
      inventory: club.inventory_count || 0,
      salesChange: 0,
      isActive: club.is_active
    } : null;
  }));
  
  return { clubsData: clubsData.filter(c => c !== null) };
}

/**
 * Reporte de Gastos:
 * Consulta los gastos reales del período.
 */
async function getExpenses(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  
  const expensesData = await Expense.find({ date: { $gte: startDate, $lte: endDate } }).lean();
  const categoryTotals = expensesData.reduce((acc, expense) => {
    if (!acc[expense.category]) acc[expense.category] = 0;
    acc[expense.category] += expense.amount;
    return acc;
  }, {});
  const totalExpenses = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);
  const categoryPercentages = Object.entries(categoryTotals).map(([category, amt]) => ({
    category,
    amount: amt,
    percentage: Math.round((amt / totalExpenses) * 100)
  }));
  const criticalExpenses = expensesData
    .filter(expense => (expense.amount / totalExpenses) >= 0.15)
    .map(expense => ({ ...expense, percentage: Math.round((expense.amount / totalExpenses) * 100) }));
  const alerts = [
    { id: 1, message: 'El gasto en Servicios aumentó un 30% respecto al mes anterior', category: 'Servicios' }
  ];
  
  return { expensesData, categoryTotals, totalExpenses, categoryPercentages, criticalExpenses, alerts };
}

/**
 * Reporte de Proyecciones Futuras:
 * Para este ejemplo se usan datos estáticos. En producción, se utilizarían modelos y algoritmos de pronóstico.
 */
async function getFutureProjections(period) {
  const projectionData = [
    { month: 'Ene', sales: 40000, expenses: 25000, profit: 15000, isProjection: false },
    { month: 'Feb', sales: 42000, expenses: 26000, profit: 16000, isProjection: false },
    { month: 'Mar', sales: 45000, expenses: 27000, profit: 18000, isProjection: false },
    { month: 'Abr', sales: 43000, expenses: 26500, profit: 16500, isProjection: false },
    { month: 'May', sales: 48000, expenses: 28000, profit: 20000, isProjection: false },
    { month: 'Jun', sales: 50000, expenses: 29000, profit: 21000, isProjection: true },
    { month: 'Jul', sales: 52000, expenses: 30000, profit: 22000, isProjection: true },
    { month: 'Ago', sales: 54000, expenses: 31000, profit: 23000, isProjection: true },
    { month: 'Sep', sales: 56000, expenses: 32000, profit: 24000, isProjection: true },
    { month: 'Oct', sales: 58000, expenses: 33000, profit: 25000, isProjection: true },
    { month: 'Nov', sales: 60000, expenses: 34000, profit: 26000, isProjection: true },
    { month: 'Dic', sales: 65000, expenses: 36000, profit: 29000, isProjection: true }
  ];
  const goalsData = [
    {
      id: '1',
      name: 'Meta mensual de ventas',
      target: 50000,
      current: 48000,
      unit: 'MXN',
      endDate: '2024-05-31',
      category: 'sales'
    },
    {
      id: '2',
      name: 'Meta de ganancia trimestral',
      target: 60000,
      current: 54500,
      unit: 'MXN',
      endDate: '2024-06-30',
      category: 'profit'
    },
    {
      id: '3',
      name: 'Nuevos clientes mensuales',
      target: 50,
      current: 35,
      unit: 'clientes',
      endDate: '2024-05-31',
      category: 'customers'
    },
    {
      id: '4',
      name: 'Reducción de stock sin rotación',
      target: 20,
      current: 8,
      unit: '%',
      endDate: '2024-06-15',
      category: 'inventory'
    }
  ];
  return { projectionData, goalsData };
}

/**
 * Reporte de Movimientos de Inventario:
 * Consulta movimientos de inventario y realiza cálculos de totales.
 */
async function getInventoryMovement(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  const movements = await InventoryMovement.find({ created_at: { $gte: startDate, $lte: endDate } }).lean();
  // Para cada movimiento, obtener información del producto
  const inventoryData = await Promise.all(movements.map(async movement => {
    const product = await Product.findById(movement.product_id).lean();
    return {
      id: movement._id,
      name: product ? product.name : 'N/A',
      category: product ? product.category : 'N/A',
      initialStock: 0, // Este valor requeriría lógica adicional
      inflow: (movement.type === 'restock' || movement.type === 'purchase') ? movement.quantity : 0,
      outflow: (movement.type !== 'restock' && movement.type !== 'purchase') ? movement.quantity : 0,
      currentStock: 0, // Requiere cálculo a partir del inventario real
      rotationDays: 0,
      rotationChange: 0,
      alert: movement.notes || ''
    };
  }));
  const totalInflow = inventoryData.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = inventoryData.reduce((sum, item) => sum + item.outflow, 0);
  const totalStock = inventoryData.reduce((sum, item) => sum + item.currentStock, 0);
  const categories = Array.from(new Set(inventoryData.map(item => item.category)));
  return { inventoryData, totalInflow, totalOutflow, totalStock, categories };
}

/**
 * Reporte de Ganancias Netas:
 * Agrupa ventas y gastos por mes para calcular el resumen y un detalle mensual.
 */
async function getNetProfit(period, club) {
  const mexicoTz = "America/Mexico_City";
  const now = moment.tz(mexicoTz);
  let startDate, endDate;
  if (period === 'weekly') {
    startDate = now.clone().startOf('isoWeek');
    endDate = now.clone().endOf('isoWeek');
  } else if (period === 'monthly') {
    startDate = now.clone().startOf('month');
    endDate = now.clone().endOf('month');
  } else {
    startDate = now.clone().startOf('year');
    endDate = now.clone().endOf('year');
  }
  
  // Ventas: se usan las fechas en la zona de México
  const salesStartDate = startDate.toDate();
  const salesEndDate = endDate.toDate();
  // Gastos: ajustar a UTC y desplazar 1 día
  const expenseStartDate = moment.utc(salesStartDate).add(-1, 'day').startOf('day').toDate();
  const expenseEndDate = moment.utc(salesEndDate).add(-1, 'day').endOf('day').toDate();

  let salesMatch = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };
  let expenseMatch = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };

  if (club) {
    try {
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
    } catch (error) {
      console.error("Club ID inválido:", club);
      return { error: "Club ID inválido" };
    }
  }
  
  // Agregación de ventas por mes (formato YYYY-MM)
  const salesAgg = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } }, totalSales: { $sum: "$total" } } },
    { $sort: { _id: 1 } }
  ]);
  
  // Agregación de gastos por mes (formato YYYY-MM)
  const expensesAgg = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, totalExpenses: { $sum: "$amount" } } },
    { $sort: { _id: 1 } }
  ]);
  
  // Construir el resumen mensual combinando ambas agregaciones
  let summaryMap = {};
  salesAgg.forEach(sale => {
    summaryMap[sale._id] = { month: sale._id.split('-')[1], sales: sale.totalSales, expenses: 0, profit: sale.totalSales };
  });
  expensesAgg.forEach(exp => {
    if (summaryMap[exp._id]) {
      summaryMap[exp._id].expenses = exp.totalExpenses;
      summaryMap[exp._id].profit = summaryMap[exp._id].sales - exp.totalExpenses;
    } else {
      summaryMap[exp._id] = { month: exp._id.split('-')[1], sales: 0, expenses: exp.totalExpenses, profit: -exp.totalExpenses };
    }
  });
  
  const monthlySummary = Object.keys(summaryMap)
    .sort()
    .map(key => summaryMap[key]);
  
  const totalSales = salesAgg.reduce((sum, s) => sum + s.totalSales, 0);
  const totalExpenses = expensesAgg.reduce((sum, e) => sum + e.totalExpenses, 0);
  const netProfit = totalSales - totalExpenses;
  const changePercentage = 0; // Para calcular se necesitaría comparar con el período anterior
  
  return {
    period: period === 'weekly' 
      ? `Semana ${startDate.format('W, YYYY')}` 
      : period === 'monthly' 
        ? startDate.format('MMMM YYYY') 
        : startDate.format('YYYY'),
    previousPeriod: period === 'weekly' 
      ? `Semana ${startDate.clone().subtract(1, 'week').format('W, YYYY')}` 
      : period === 'monthly' 
        ? startDate.clone().subtract(1, 'month').format('MMMM YYYY') 
        : startDate.clone().subtract(1, 'year').format('YYYY'),
    totalSales,
    totalExpenses,
    netProfit,
    changePercentage,
    isPositive: netProfit >= 0,
    monthlySummary
  };
}

/**
 * Reporte de Margen de Producto:
 * Consulta productos y calcula el margen, porcentaje y ganancia total en ventas.
 */
async function getProductMargin(period) {
  // Se obtienen todos los productos y se agregan las ventas acumuladas.
  const products = await Product.find({}).lean();
  const salesAgg = await Sale.aggregate([
    { $match: { created_at: { $gte: new Date("2024-01-01"), $lte: new Date() } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product_id", totalQuantity: { $sum: "$items.quantity" } } }
  ]);
  
  const productsData = products.map(prod => {
    const saleData = salesAgg.find(s => s._id.toString() === prod._id.toString());
    const salesQuantity = saleData ? saleData.totalQuantity : 0;
    const margin = prod.sale_price - prod.purchase_price;
    const marginPercentage = (margin / prod.sale_price) * 100;
    const totalProfit = margin * salesQuantity;
    return {
      id: prod._id,
      name: prod.name,
      type: prod.type,
      cost: prod.purchase_price,
      price: prod.sale_price,
      margin,
      marginPercentage: Math.round(marginPercentage),
      sales: salesQuantity,
      totalProfit
    };
  });
  
  const avgMarginPercentage = productsData.reduce((sum, p) => sum + p.marginPercentage, 0) / productsData.length;
  const totalProfitAll = productsData.reduce((sum, p) => sum + p.totalProfit, 0);
  const mostProfitableProduct = productsData.reduce((prev, curr) => prev.marginPercentage > curr.marginPercentage ? prev : curr);
  const highestProfitProduct = productsData.reduce((prev, curr) => prev.totalProfit > curr.totalProfit ? prev : curr);
  
  return { productsData, avgMarginPercentage, totalProfit: totalProfitAll, mostProfitableProduct, highestProfitProduct };
}

/**
 * Reporte de Ventas:
 * Consulta ventas reales y procesa los datos.
 */
async function getSales(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  
  const salesDataRaw = await Sale.find({ created_at: { $gte: startDate, $lte: endDate } }).lean();
  let flatSales = [];
  salesDataRaw.forEach(sale => {
    sale.items.forEach(item => {
      flatSales.push({
        product: item.product_id, // Se podría hacer populate para obtener el nombre
        quantity: item.quantity,
        revenue: item.unit_price * item.quantity,
        club: sale.club,
        type: item.type
      });
    });
  });
  const totalRevenue = flatSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalQuantity = flatSales.reduce((sum, s) => sum + s.quantity, 0);
  const topProducts = [...flatSales].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  
  const dailySalesAgg = await Sale.aggregate([
    { $match: { created_at: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, sales: { $sum: "$total" } } },
    { $sort: { _id: 1 } }
  ]);
  const dailySales = dailySalesAgg.map(item => ({
    day: item._id.substr(8, 2),
    sales: item.sales
  }));
  
  // Distribución por categoría: este ejemplo es estático; se podría derivar de la información de productos
  const categoryData = [
    { name: 'Suplementos', percentage: 60, value: 3150 },
    { name: 'Preparados', percentage: 40, value: 1920 },
  ];
  
  return { salesData: flatSales, totalRevenue, totalQuantity, topProducts, dailySales, categoryData };
}

/**
 * Reporte de Historial de Movimientos:
 * Combina transacciones de ventas, gastos y ajustes.
 */
async function getTransactionHistory(period) {
  let startDate, endDate;
  const now = new Date();
  if (period === 'weekly') {
    startDate = moment(now).startOf('week').toDate();
    endDate = moment(now).endOf('week').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else {
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }
  
  // Ventas
  const sales = await Sale.find({ created_at: { $gte: startDate, $lte: endDate } }).lean();
  const salesTransactions = [];
  for (const sale of sales) {
    sale.items.forEach(item => {
      salesTransactions.push({
        id: sale._id,
        date: sale.created_at,
        type: 'sale',
        description: `Venta de producto ${item.product_id}`,
        amount: sale.total,
        category: 'Sales',
        reference: `Venta #${sale._id}`
      });
    });
  }
  // Gastos
  const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } }).lean();
  const expenseTransactions = expenses.map(expense => ({
    id: expense._id,
    date: expense.date,
    type: 'expense',
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    reference: expense.receipt_url || ''
  }));
  // Ajustes de inventario (por ejemplo, de movimientos con tipo 'other')
  const adjustments = await InventoryMovement.find({ 
    created_at: { $gte: startDate, $lte: endDate },
    type: 'other'
  }).lean();
  const adjustmentTransactions = adjustments.map(adj => ({
    id: adj._id,
    date: adj.created_at,
    type: 'adjustment',
    description: adj.notes || 'Ajuste de inventario',
    amount: -Math.abs(adj.quantity),
    category: 'Inventory',
    reference: ''
  }));
  
  const transactionsData = [...salesTransactions, ...expenseTransactions, ...adjustmentTransactions];
  transactionsData.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { transactionsData };
}

// Función central que llama a cada función según el tipo de reporte
async function getReportData(type, period) {
  switch (type) {
    case 'executive-summary': return await getExecutiveSummary(period);
    case 'cash-flow': return await getCashFlow(period);
    case 'club-performance': return await getClubPerformance(period);
    case 'expenses': return await getExpenses(period);
    case 'future-projections': return await getFutureProjections(period);
    case 'inventory-movement': return await getInventoryMovement(period);
    case 'net-profit': return await getNetProfit(period);
    case 'product-margin': return await getProductMargin(period);
    case 'sales': return await getSales(period);
    case 'transaction-history': return await getTransactionHistory(period);
    default:
      return { message: 'Tipo de reporte no encontrado' };
  }
}

async function getSalesExpensesChartData(period, club) {
  const mexicoTz = "America/Mexico_City";
  const now = moment.tz(mexicoTz);
  let startDate, endDate;

  if (period === 'weekly') {
    startDate = now.clone().startOf('isoWeek');
    endDate = now.clone().endOf('isoWeek');
  } else if (period === 'monthly') {
    startDate = now.clone().startOf('month');
    endDate = now.clone().endOf('month');
  } else { // yearly
    startDate = now.clone().startOf('year');
    endDate = now.clone().endOf('year');
  }

  // Fechas para ventas (almacenadas en zona de México)
  const salesStartDate = startDate.toDate();
  const salesEndDate = endDate.toDate();

  // Fechas para gastos (almacenados en UTC, se desplazan 1 día)
  const expenseStartDate = moment.utc(salesStartDate).add(-1, 'day').startOf('day').toDate();
  const expenseEndDate = moment.utc(salesEndDate).add(-1, 'day').endOf('day').toDate();

  // Construir el filtro de búsqueda para ventas y gastos
  let salesMatch = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };
  let expenseMatch = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };
  if (club) {
    try {
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
    } catch (error) {
      console.error("Club ID inválido:", club);
      return []; // Retorna un array vacío si el id no es válido
    }
  }

  // Agregación de ventas agrupadas por día
  const salesData = await Sale.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
        totalSales: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Agregación de gastos agrupados por día
  const expenseData = await Expense.aggregate([
    { $match: expenseMatch },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        totalExpenses: { $sum: "$amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fusionar resultados en un mapa (dataMap)
  let dataMap = {};
  salesData.forEach(item => {
    dataMap[item._id] = { date: item._id, sales: item.totalSales, expenses: 0 };
  });
  expenseData.forEach(item => {
    if (dataMap[item._id]) {
      dataMap[item._id].expenses = item.totalExpenses;
    } else {
      dataMap[item._id] = { date: item._id, sales: 0, expenses: item.totalExpenses };
    }
  });

  // Generar un arreglo completo con cada día entre startDate y endDate
  let completeData = [];
  let current = startDate.clone();
  while (current.isSameOrBefore(endDate, 'day')) {
    const dateStr = current.format("YYYY-MM-DD");
    if (dataMap[dateStr]) {
      completeData.push(dataMap[dateStr]);
    } else {
      completeData.push({ date: dateStr, sales: 0, expenses: 0 });
    }
    current.add(1, 'day');
  }

  return completeData;
}


router.get('/', async (req, res) => {
  const { type, period, club } = req.query;
  try {
    if (type === 'net-profit') {
      const result = await getNetProfit(period, club);
      res.json(result);
    } else if (type === 'executive-summary') {
      const summary = await getExecutiveSummary(period, club);
      res.json(summary);
    } else {
      res.status(400).json({ error: 'Tipo de reporte no soportado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el reporte' });
  }
});

router.get('/sales-expenses', async (req, res) => {
  const { period, club } = req.query;
  try {
    const chartData = await getSalesExpensesChartData(period, club);
    res.json(chartData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos de ventas y gastos' });
  }
});
router.get('/export', async (req, res) => {
  try {
    const type = req.query.type || 'executive-summary';
    const period = req.query.period || 'monthly';
    const reportData = await getReportData(type, period);
    const csv = generateCSV(reportData);
    res.setHeader('Content-disposition', `attachment; filename=${type}_${period}_report.csv`);
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exportando reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Función auxiliar para generar CSV (simplificada)
function generateCSV(data) {
  if (Array.isArray(data)) {
    const keys = Object.keys(data[0]);
    let csv = keys.join(',') + '\n';
    data.forEach(item => {
      csv += keys.map(key => item[key]).join(',') + '\n';
    });
    return csv;
  } else if (typeof data === 'object') {
    let csv = '';
    for (let key in data) {
      if (typeof data[key] !== 'object') {
        csv += `${key},${data[key]}\n`;
      }
    }
    return csv;
  }
  return '';
}

module.exports = router;


