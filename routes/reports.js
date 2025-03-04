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
const  authMiddleware = require('../middleware/auth');
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
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };
      expenseMatch.club = { $in: club };
    } else {
      // Filtro para un club específico
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
    }
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
  const prevExpenseStart = moment.utc(prevSalesStart).add(-1, 'day').startOf('day').toDate();
  const prevExpenseEnd = moment.utc(prevSalesEnd).add(-1, 'day').endOf('day').toDate();

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
async function getCashFlow(period, club) {
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
  
  // Filtrado para ventas (Sales)
  const salesMatch = {
    created_at: { $gte: salesStartDate, $lte: salesEndDate }
  };
  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };
    } else {
      // Filtro para un club específico
      salesMatch.club = mongoose.Types.ObjectId(club);
    }
  }
  const salesDaily = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { 
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
        total: { $sum: "$total" }
      } 
    }
  ]);
  
  // Filtrado para gastos (Expenses)
  const expenseMatch = {
    date: { $gte: expenseStartDate, $lte: expenseEndDate }
  };
  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      expenseMatch.club = { $in: club };
    } else {
      // Filtro para un club específico
      expenseMatch.club = (club);
    }
  }
  
  const expensesDaily = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { 
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        total: { $sum: "$amount" }
      } 
    }
  ]);
  
  // Crear un mapa con los datos diarios (ventas y gastos)
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
  
  // Generar el array de días dentro del período (cada día con su flujo)
  const days = [];
  const iterDate = startDate.clone();
  while (iterDate.isSameOrBefore(endDate, 'day')) {
    const dateStr = iterDate.format("YYYY-MM-DD");
    const inflow = cashFlowMap[dateStr] ? cashFlowMap[dateStr].inflow : 0;
    const outflow = cashFlowMap[dateStr] ? cashFlowMap[dateStr].outflow : 0;
    days.push({ date: dateStr, inflow, outflow, balance: inflow - outflow });
    iterDate.add(1, 'day');
  }
  
  // Calcular el saldo actual (Disponible hoy) como la suma neta de los días hasta hoy
  const todayStr = now.format("YYYY-MM-DD");
  const currentBalance = days
    .filter(day => day.date && day.date <= todayStr)
    .reduce((acc, d) => acc + (d.inflow - d.outflow), 0);
  
  // Calcular la proyección: suma de salidas para los próximos 7 días (excluyendo hoy)
  const next7DaysOutflow = days
    .filter(day =>
      day.date &&
      moment(day.date).isAfter(todayStr, 'day') &&
      moment(day.date).isSameOrBefore(now.clone().add(7, 'days'), 'day')
    )
    .reduce((acc, d) => acc + d.outflow, 0);
  
  return { 
    currentMonth: now.format("MMMM YYYY"), 
    cashFlowData: days, 
    currentBalance, 
    next7DaysOutflow 
  };
}
/**
 * Reporte de Desempeño por Club:
 * Agrupa ventas por club y junta datos del Club.
 */
async function getClubPerformance(period, club) {
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

  // Construir los filtros para ventas y gastos
  let salesMatch = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };
  let expenseMatch = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };
  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };
      expenseMatch.club = { $in: club };
    } else {
      // Filtro para un club específico
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
    }
  }

  // Agregar ventas del período actual
  const clubsSalesAgg = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: "$club", totalSales: { $sum: "$total" } } }
  ]);

  // Agregar gastos del período actual
  const clubsExpenseAgg = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: "$club", totalExpenses: { $sum: "$amount" } } }
  ]);

  // Construir diccionarios para acceso rápido
  const salesDict = {};
  clubsSalesAgg.forEach(item => {
    salesDict[item._id.toString()] = item.totalSales;
  });
  const expenseDict = {};
  clubsExpenseAgg.forEach(item => {
    expenseDict[item._id.toString()] = item.totalExpenses;
  });

  // Obtener la lista de clubs a partir de las claves de ambos diccionarios
  const clubIdsSet = new Set([...Object.keys(salesDict), ...Object.keys(expenseDict)]);
  const clubsData = await Promise.all(Array.from(clubIdsSet).map(async clubId => {
    const clubInfo = await Club.findById(clubId).lean();
    if (!clubInfo) return null;
    const currentSales = salesDict[clubId] || 0;
    const currentExpenses = expenseDict[clubId] || 0;
    const profit = currentSales - currentExpenses;
    return {
      id: clubInfo._id,
      name: clubInfo.clubName || clubInfo.name,
      address: clubInfo.address,
      sales: currentSales,
      expenses: currentExpenses,
      profit: profit,
      employees: clubInfo.employee_count || 0,
      customers: clubInfo.customers_count || 0,
      inventory: clubInfo.inventory_count || 0,
      salesChange: 0, // Aquí podrías calcular el cambio de ventas comparado con el período anterior
      isActive: clubInfo.is_active
    };
  }));
  const filteredClubsData = clubsData.filter(c => c !== null);

  // Calcular totales globales a partir de los clubs obtenidos
  const globalSales = filteredClubsData.reduce((sum, club) => sum + club.sales, 0);
  const globalExpenses = filteredClubsData.reduce((sum, club) => sum + club.expenses, 0);
  const globalProfit = globalSales - globalExpenses;

  return { 
    clubsData: filteredClubsData, 
    globalSales, 
    globalExpenses, 
    globalProfit 
  };
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
async function getInventoryMovement(period, club) {
  let startDate, endDate;
  const now = new Date();

  if (period === 'weekly') {
    // Usamos isoWeek para que el inicio sea el lunes y el fin el domingo
    startDate = moment(now).startOf('isoWeek').toDate();
    endDate = moment(now).endOf('isoWeek').toDate();
  } else if (period === 'monthly') {
    startDate = moment(now).startOf('month').toDate();
    endDate = moment(now).endOf('month').toDate();
  } else { // yearly
    startDate = moment(now).startOf('year').toDate();
    endDate = moment(now).endOf('year').toDate();
  }

  // Consulta de movimientos dentro del período
  const periodQuery = {
    created_at: { $gte: startDate, $lte: endDate }
  };
  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      periodQuery.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };

    } else {
      // Filtro para un club específico
      periodQuery.club = mongoose.Types.ObjectId(club);

    }
  }

  
  const periodMovements = await InventoryMovement.find(periodQuery).lean();

  // Agrupar movimientos por producto
  const productMap = {};
  const netMovementMap = {};

  periodMovements.forEach(movement => {
    const productId = movement.product_id.toString();
    if (!productMap[productId]) {
      productMap[productId] = { inflow: 0, outflow: 0, movements: [] };
      netMovementMap[productId] = 0;
    }
    // Almacenamos el movimiento para luego enviarlo al frontend
    productMap[productId].movements.push(movement);
    // Para ingresos (restock o purchase) sumamos la cantidad
    if (movement.type === 'restock' || movement.type === 'purchase') {
      productMap[productId].inflow += movement.quantity;
      netMovementMap[productId] += movement.quantity;
    } else {
      // Para salidas, sumamos el valor absoluto para el reporte,
      // pero en el neto se utiliza el valor con signo (normalmente negativo)
      productMap[productId].outflow += Math.abs(movement.quantity);
      netMovementMap[productId] += movement.quantity;
    }
  });

  // Para cada producto, calcular el stock inicial a partir de movimientos anteriores al período
  const inventoryDataPromises = Object.keys(productMap).map(async productId => {
    const previousQuery = {
      product_id: productId,
      created_at: { $lt: startDate }
    };

    if (club) {
      if (Array.isArray(club)) {
        // En modo global, club es un arreglo de IDs: se usa el operador $in
        previousQuery.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };
  
      } else {
        // Filtro para un club específico
        previousQuery.club = mongoose.Types.ObjectId(club);
  
      }
    }
    const previousMovements = await InventoryMovement.find(previousQuery).lean();
    let initialStock = 0;
    previousMovements.forEach(m => {
      initialStock += m.quantity;
    });

    // Obtener información del producto
    const product = await Product.findById(productId).lean();
    const inflow = productMap[productId].inflow;
    const outflow = productMap[productId].outflow;
    const netPeriod = netMovementMap[productId];
    const currentStock = initialStock + netPeriod;

    return {
      id: productId,
      name: product ? product.name : 'N/A',
      category: product ? product.category : 'N/A',
      initialStock,
      inflow,
      outflow,
      currentStock,
      rotationDays: 0,    // Lógica pendiente para rotación
      rotationChange: 0,  // Lógica pendiente para cambio en rotación
      alert: '',          // Puedes agregar lógica de alertas según criterios definidos
      movements: productMap[productId].movements || [] // Aseguramos que sea un arreglo
    };
  });

  const inventoryData = await Promise.all(inventoryDataPromises);

  // Totales generales
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
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };
      expenseMatch.club = { $in: club };
    } else {
      // Filtro para un club específico
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
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
async function getProductMargin(period, club) {
  const mexicoTz = "America/Mexico_City";
  const now = moment.tz(mexicoTz);
  let startDate, endDate;
  
  if (period === 'weekly') {
    startDate = now.clone().startOf('isoWeek').toDate();
    endDate = now.clone().endOf('isoWeek').toDate();
  } else if (period === 'monthly') {
    startDate = now.clone().startOf('month').toDate();
    endDate = now.clone().endOf('month').toDate();
  } else {
    startDate = now.clone().startOf('year').toDate();
    endDate = now.clone().endOf('year').toDate();
  }

  // Filtrar productos por club si se envía
  const productQuery = club ? { club } : {};
  const products = await Product.find(productQuery).lean();

  // Agregar el filtro por fechas para ventas (Sales)
  const saleMatch = {
    created_at: { $gte: startDate, $lte: endDate }
  };

  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      saleMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };

    } else {
      // Filtro para un club específico
      saleMatch.club = mongoose.Types.ObjectId(club);

    }
  }

  const salesAgg = await Sale.aggregate([
    { $match: saleMatch },
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
  const mostProfitableProduct = productsData.reduce((prev, curr) =>
    prev.marginPercentage > curr.marginPercentage ? prev : curr
  );
  const highestProfitProduct = productsData.reduce((prev, curr) =>
    prev.totalProfit > curr.totalProfit ? prev : curr
  );

  return {
    productsData,
    avgMarginPercentage,
    totalProfit: totalProfitAll,
    mostProfitableProduct,
    highestProfitProduct
  };
}

/**
 * Reporte de Ventas:
 * Consulta ventas reales y procesa los datos.
 */
async function getSales(period, club) {
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
  
  // Construir query de ventas con filtro opcional de club
  let query = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };

  
  if (club) {
    try {
      query.club = mongoose.Types.ObjectId(club);
    } catch (error) {
      console.error("Club ID inválido:", club);
    }
  }

  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      query.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };

    } else {
      // Filtro para un club específico
      query.club = mongoose.Types.ObjectId(club);

    }
  }
  
  // Se usa populate para obtener el nombre y la categoría del producto, y el nombre del club
  const salesDataRaw = await Sale.find(query)
    .populate('items.product_id', 'name category')
    .populate('club', 'clubName name')
    .lean();
    
  let flatSales = [];
  salesDataRaw.forEach(sale => {
    sale.items.forEach(item => {
      flatSales.push({
        product: item.product_id ? item.product_id.name : 'N/A',
        category: item.product_id ? item.product_id.category : 'Sin categoría',
        quantity: item.quantity,
        revenue: item.unit_price * item.quantity,
        club: sale.club ? (sale.club.clubName || sale.club.name || 'N/A') : 'N/A',
        type: item.type
      });
    });
  });
  
  const totalRevenue = flatSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalQuantity = flatSales.reduce((sum, s) => sum + s.quantity, 0);
  const topProducts = [...flatSales]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // Agrupar las ventas planas por día para el gráfico de ventas diarias
  const dailySalesAgg = await Sale.aggregate([
    { $match: query },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, sales: { $sum: "$total" } } },
    { $sort: { _id: 1 } }
  ]);
  
  const dailySales = dailySalesAgg.map(item => ({
    day: item._id.substr(8, 2),
    sales: item.sales
  }));
  
  // Calcular la distribución por categoría a partir de los datos reales
  const categoryMap = {};
  flatSales.forEach(item => {
    const cat = item.category || 'Sin categoría';
    if (!categoryMap[cat]) {
      categoryMap[cat] = 0;
    }
    categoryMap[cat] += item.revenue;
  });
  const categoryData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    value: Math.round(categoryMap[cat]),
    percentage: totalRevenue > 0 ? Math.round((categoryMap[cat] / totalRevenue) * 100) : 0
  }));
  
  return { 
    salesData: flatSales, 
    totalRevenue, 
    totalQuantity, 
    topProducts, 
    dailySales, 
    categoryData 
  };
}
/**
 * Reporte de Historial de Movimientos:
 * Combina transacciones de ventas, gastos y ajustes.
 */
async function getTransactionHistory(period, club) {
  const mexicoTz = "America/Mexico_City";
  const now = moment.tz(mexicoTz);
  let startDate, endDate;

  // Para ventas usamos la hora de México - MISMO CÓDIGO QUE EN getSales()
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

  // Ventas: usar el rango en México
  const salesQuery = { created_at: { $gte: salesStartDate, $lte: salesEndDate } };


  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesQuery.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };

    } else {
      // Filtro para un club específico
      salesQuery.club = mongoose.Types.ObjectId(club);

    }
  }
  
  
  console.log("Query de ventas:", salesQuery);
  const sales = await Sale.find(salesQuery).lean();
  const salesTransactions = [];
  
  // Corregido: crear una sola transacción por venta
  for (const sale of sales) {
    salesTransactions.push({
      id: sale._id,
      date: sale.created_at,
      type: 'sale',
      description: `Venta de ${sale.items.length} producto(s)`,
      amount: sale.total,
      category: 'Sales',
      reference: `Venta #${sale._id}`
    });
  }

  // Gastos: usar el rango en UTC
  const expenseQuery = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };

  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      expenseQuery.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };

    } else {
      // Filtro para un club específico
      expenseQuery.club = mongoose.Types.ObjectId(club);

    }
  }
  
  const expenses = await Expense.find(expenseQuery).lean();
  const expenseTransactions = expenses.map(expense => ({
    id: expense._id,
    date: expense.date,
    type: 'expense',
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    reference: expense.receipt_url || ''
  }));

  const transactionsData = [...salesTransactions, ...expenseTransactions];
  transactionsData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Crear etiqueta del período y rango de fechas para mostrar en el frontend
  let periodLabel = "";
  if (period === 'weekly') {
    periodLabel = "Semana actual";
  } else if (period === 'monthly') {
    periodLabel = "Mes actual";
  } else {
    periodLabel = "Año actual";
  }
  
  // Formatear fechas para el rango en el mismo formato que usa getSales
  const periodRange = {
    start: startDate.format('YYYY-MM-DD'),
    end: endDate.format('YYYY-MM-DD')
  };
  
  return { 
    transactionsData, 
    periodLabel,
    periodRange
  };
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
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      salesMatch.club = { $in: club.map(id => mongoose.Types.ObjectId(id)) };
      expenseMatch.club = { $in: club };
    } else {
      // Filtro para un club específico
      salesMatch.club = mongoose.Types.ObjectId(club);
      expenseMatch.club = club;
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

async function getExpenses(period, club) {
  // Usar la zona "America/Mexico_City" para definir el período
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
  
  // Ajuste para gastos: convertir las fechas a UTC y desplazar 1 día para tener el rango de 12am a 12am
  const expenseStartDate = moment.utc(startDate.toDate()).add(-1, 'day').startOf('day').toDate();
  const expenseEndDate = moment.utc(endDate.toDate()).add(-1, 'day').endOf('day').toDate();
  
  // Construir la consulta con filtro opcional de club
  let query = { date: { $gte: expenseStartDate, $lte: expenseEndDate } };
  if (club) {
    if (Array.isArray(club)) {
      // En modo global, club es un arreglo de IDs: se usa el operador $in
      query.club = { $in: club.map(club => mongoose.Types.ObjectId(club)) };

    } else {
      // Filtro para un club específico
      query.club = mongoose.Types.ObjectId(club);

    }
  }
  
  // Extraer los gastos reales
  const expensesData = await Expense.find(query).lean();
  
  // Totales por categoría
  const categoryTotals = expensesData.reduce((acc, expense) => {
    if (!acc[expense.category]) acc[expense.category] = 0;
    acc[expense.category] += expense.amount;
    return acc;
  }, {});
  
  const totalExpenses = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);
  
  // Calcular porcentajes por categoría
  const categoryPercentages = Object.entries(categoryTotals).map(([category, amt]) => ({
    category,
    amount: amt,
    percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0
  }));
  
  // Filtrar gastos críticos (por ejemplo, aquellos que representan al menos el 15% del total)
  const criticalExpenses = expensesData
    .filter(expense => totalExpenses > 0 && (expense.amount / totalExpenses) >= 0.15)
    .map(expense => ({
      ...expense,
      percentage: Math.round((expense.amount / totalExpenses) * 100)
    }));
  
  // Alertas (ejemplo real; en producción se calcularían comparando con períodos anteriores)
  const alerts = [
    { id: 1, message: 'El gasto en Servicios aumentó un 30% respecto al mes anterior', category: 'Servicios' }
  ];
  
  return { expensesData, categoryTotals, totalExpenses, categoryPercentages, criticalExpenses, alerts };
}
async function getClubsForUser(userId) {
  try {
    console.log('Obteniendo clubes para el usuario:', userId);
    const clubs = await Club.find({ user: userId });
    return clubs.map(club => club._id.toString());
  } catch (err) {
    console.error('Error al obtener clubes para el usuario:', err);
    return [];
  }
}
router.get('/', authMiddleware, async (req, res) => {
  const { type, period, club } = req.query;
  let clubFilter = club;

  if (club === 'global') {
    clubFilter = await getClubsForUser(req.userId);
    console.log('Clubes para el usuario:', clubFilter);
    // Ahora clubFilter es un arreglo de IDs, que las funciones de reporte deberán manejar
  }

  
  try {
    if (type === 'product-margin') {
      const result = await getProductMargin(period, clubFilter);
      res.json(result);
    } else if (type === 'inventory-movement') {
      const result = await getInventoryMovement(period, clubFilter);
      res.json(result);
    } else if (type === 'expenses') {
      const result = await getExpenses(period, clubFilter);
      res.json(result);
    } else if (type === 'sales') {
      const result = await getSales(period, clubFilter);
      res.json(result);
    } else if (type === 'net-profit') {
      const result = await getNetProfit(period, clubFilter);
      res.json(result);
    } else if (type === 'executive-summary') {
      const summary = await getExecutiveSummary(period, clubFilter);
      res.json(summary);
    } else if (type === 'cash-flow') {  // Flujo de caja
      const result = await getCashFlow(period, clubFilter);
      res.json(result);
    } else if (type === 'club-performance') {
      const result = await getClubPerformance(period, clubFilter);
      res.json(result);
    } else if (type === 'transaction-history') {
      const result = await getTransactionHistory(period, clubFilter);
      res.json(result);
    } else if (type === 'future-projections') {
      // Temporalmente devuelve los datos de prueba, pero en producción podría devolver un mensaje
      // indicando que la característica estará disponible próximamente
      const result = await getFutureProjections(period);
      res.json(result);
    }
    else {
      res.status(400).json({ error: 'Tipo de reporte no soportado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el reporte' });
  }
});

router.get('/sales-expenses', async (req, res) => {
  const { period, club } = req.query;
  let clubFilter = club;

  if (club === 'global') {
    clubFilter = await getClubsForUser(req.userId);
    console.log('Clubes para el usuario:', clubFilter);
    // Ahora clubFilter es un arreglo de IDs, que las funciones de reporte deberán manejar
  }
  try {
    const chartData = await getSalesExpensesChartData(period, clubFilter);
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


