// routes/reports.js
const express = require('express');
const router = express.Router();

async function getReportData(type, period) {
  switch (type) {
    case 'executive-summary':
      return {
        netProfit: 45000,
        netProfitChange: 15,
        topProduct: { name: 'Proteína Whey', sales: 12000, percentage: 30 },
        topExpense: { name: 'Compra de Inventario', amount: 18000, percentage: 40 },
        topClub: { name: 'ProteHouse Central', sales: 28000, percentage: 60 },
        recommendations: [
          { id: 1, text: 'Aumenta el stock de Proteína Whey: representa el 30% de tus ventas.', type: 'positive' },
          { id: 2, text: 'Reduce gastos en servicios: son un 15% más altos que el promedio.', type: 'negative' },
          { id: 3, text: 'Considera promociones en productos con baja rotación como "BCAA".', type: 'neutral' }
        ]
      };
    case 'cash-flow':
      return {
        currentMonth: 'Mayo 2024',
        cashFlowData: [
          { date: '2024-05-01', inflow: 500, outflow: 200, balance: 300 },
          { date: '2024-05-02', inflow: 300, outflow: 150, balance: 150 },
          { date: '2024-05-03', inflow: 400, outflow: 100, balance: 300 },
          // ... (otros días del mes)
          { date: '2024-05-31', inflow: 700, outflow: 300, balance: 400 }
        ],
        currentBalance: 5000,
        next7DaysOutflow: 1200
      };
    case 'club-performance':
      return {
        clubsData: [
          { 
            id: '1',
            name: 'ProteHouse Central', 
            address: 'Av. Insurgentes Sur 1234, CDMX',
            sales: 45000,
            expenses: 28000,
            profit: 17000,
            employees: 5,
            customers: 350,
            inventory: 120,
            salesChange: 15,
            isActive: true
          },
          { 
            id: '2',
            name: 'ProteHouse Polanco', 
            address: 'Calle Masaryk 123, Polanco, CDMX',
            sales: 32000,
            expenses: 20000,
            profit: 12000,
            employees: 3,
            customers: 280,
            inventory: 85,
            salesChange: 8,
            isActive: true
          },
          { 
            id: '3',
            name: 'ProteHouse Condesa', 
            address: 'Av. Tamaulipas 456, Condesa, CDMX',
            sales: 0,
            expenses: 5000,
            profit: -5000,
            employees: 0,
            customers: 0,
            inventory: 0,
            salesChange: -100,
            isActive: false
          }
        ]
      };
    case 'expenses': {
      const expensesData = [
        { category: 'Inventario', subcategory: 'Proteínas', amount: 1200, date: '2024-05-10', description: 'Compra de 100 bolsas de proteína' },
        { category: 'Inventario', subcategory: 'Empaques', amount: 300, date: '2024-05-12', description: 'Vasos y tapas para batidos' },
        { category: 'Nómina', subcategory: 'Sueldos', amount: 800, date: '2024-05-15', description: 'Pago quincenal a empleados' },
        { category: 'Servicios', subcategory: 'Electricidad', amount: 150, date: '2024-05-05', description: 'Recibo de luz' },
        { category: 'Servicios', subcategory: 'Internet', amount: 80, date: '2024-05-08', description: 'Servicio mensual de internet' },
        { category: 'Otros', subcategory: 'Limpieza', amount: 100, date: '2024-05-20', description: 'Productos de limpieza' }
      ];
      const categoryTotals = expensesData.reduce((acc, expense) => {
        if (!acc[expense.category]) acc[expense.category] = 0;
        acc[expense.category] += expense.amount;
        return acc;
      }, {});
      const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
      const categoryPercentages = Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalExpenses) * 100)
      }));
      const criticalExpenses = expensesData
        .filter(expense => (expense.amount / totalExpenses) >= 0.15)
        .map(expense => ({
          ...expense,
          percentage: Math.round((expense.amount / totalExpenses) * 100)
        }));
      const alerts = [
        { id: 1, message: 'El gasto en Servicios aumentó un 30% respecto al mes anterior', category: 'Servicios' }
      ];
      return { expensesData, categoryTotals, totalExpenses, categoryPercentages, criticalExpenses, alerts };
    }
    case 'future-projections': {
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
    case 'inventory-movement': {
      const inventoryData = [
        { 
          id: '1',
          name: 'Proteína Whey', 
          category: 'Suplementos',
          initialStock: 100,
          inflow: 50,
          outflow: 80,
          currentStock: 70,
          rotationDays: 15,
          rotationChange: -50,
          alert: 'Se está agotando 2x más rápido que el mes pasado'
        },
        { 
          id: '2',
          name: 'BCAA', 
          category: 'Suplementos',
          initialStock: 80,
          inflow: 20,
          outflow: 30,
          currentStock: 70,
          rotationDays: 45,
          rotationChange: 10
        },
        { 
          id: '3',
          name: 'Creatina', 
          category: 'Suplementos',
          initialStock: 50,
          inflow: 30,
          outflow: 25,
          currentStock: 55,
          rotationDays: 30,
          rotationChange: 5
        },
        { 
          id: '4',
          name: 'Vasos para batidos', 
          category: 'Empaques',
          initialStock: 200,
          inflow: 100,
          outflow: 150,
          currentStock: 150,
          rotationDays: 20,
          rotationChange: -15,
          alert: 'Stock bajo, considere reordenar'
        },
        { 
          id: '5',
          name: 'Harina de avena', 
          category: 'Ingredientes',
          initialStock: 30,
          inflow: 20,
          outflow: 35,
          currentStock: 15,
          rotationDays: 10,
          rotationChange: -30,
          alert: 'Stock crítico'
        }
      ];
      const totalInflow = inventoryData.reduce((sum, item) => sum + item.inflow, 0);
      const totalOutflow = inventoryData.reduce((sum, item) => sum + item.outflow, 0);
      const totalStock = inventoryData.reduce((sum, item) => sum + item.currentStock, 0);
      const categories = Array.from(new Set(inventoryData.map(item => item.category)));
      return { inventoryData, totalInflow, totalOutflow, totalStock, categories };
    }
    case 'net-profit': {
      const profitData = {
        period: period === 'weekly' ? 'Semana 20, 2024' : period === 'monthly' ? 'Mayo 2024' : '2024',
        previousPeriod: period === 'weekly' ? 'Semana 19, 2024' : period === 'monthly' ? 'Abril 2024' : '2023',
        totalSales: 5000,
        totalExpenses: 3000,
        netProfit: 2000,
        changePercentage: 15,
        isPositive: true,
        monthlySummary: [
          { month: 'Ene', sales: 4200, expenses: 2800, profit: 1400 },
          { month: 'Feb', sales: 4500, expenses: 2900, profit: 1600 },
          { month: 'Mar', sales: 4800, expenses: 3100, profit: 1700 },
          { month: 'Abr', sales: 4300, expenses: 2700, profit: 1600 },
          { month: 'May', sales: 5000, expenses: 3000, profit: 2000 },
          { month: 'Jun', sales: 0, expenses: 0, profit: 0 }
        ]
      };
      return profitData;
    }
    case 'product-margin': {
      // Datos simulados para margen de producto
      const productsData = [
        { 
          id: '1',
          name: 'Proteína Whey', 
          type: 'sealed', 
          cost: 800, 
          price: 1200, 
          margin: 400,
          marginPercentage: 33,
          sales: 50,
          totalProfit: 20000
        },
        { 
          id: '2',
          name: 'BCAA', 
          type: 'sealed', 
          cost: 400, 
          price: 600, 
          margin: 200,
          marginPercentage: 33,
          sales: 30,
          totalProfit: 6000
        },
        { 
          id: '3',
          name: 'Batido de Proteína', 
          type: 'prepared', 
          cost: 50, 
          price: 120, 
          margin: 70,
          marginPercentage: 58,
          sales: 120,
          totalProfit: 8400
        },
        { 
          id: '4',
          name: 'Waffle Proteico', 
          type: 'prepared', 
          cost: 40, 
          price: 90, 
          margin: 50,
          marginPercentage: 56,
          sales: 80,
          totalProfit: 4000
        },
        { 
          id: '5',
          name: 'Creatina', 
          type: 'sealed', 
          cost: 500, 
          price: 750, 
          margin: 250,
          marginPercentage: 33,
          sales: 25,
          totalProfit: 6250
        },
      ];
      const avgMarginPercentage = productsData.reduce((sum, product) => sum + product.marginPercentage, 0) / productsData.length;
      const totalProfit = productsData.reduce((sum, product) => sum + product.totalProfit, 0);
      const mostProfitableProduct = productsData.reduce((prev, current) =>
        (prev.marginPercentage > current.marginPercentage ? prev : current)
      );
      const highestProfitProduct = productsData.reduce((prev, current) =>
        (prev.totalProfit > current.totalProfit ? prev : current)
      );
      return { productsData, avgMarginPercentage, totalProfit, mostProfitableProduct, highestProfitProduct };
    }

    case 'sales': {
      // Datos simulados para reporte de ventas
      const salesData = [
        { product: 'Proteína Whey', quantity: 50, revenue: 1500, club: 'ProteHouse Central', type: 'sealed' },
        { product: 'BCAA', quantity: 30, revenue: 900, club: 'ProteHouse Polanco', type: 'sealed' },
        { product: 'Batido de Proteína', quantity: 120, revenue: 1200, club: 'ProteHouse Central', type: 'prepared' },
        { product: 'Waffle Proteico', quantity: 80, revenue: 720, club: 'ProteHouse Polanco', type: 'prepared' },
        { product: 'Creatina', quantity: 25, revenue: 750, club: 'ProteHouse Central', type: 'sealed' },
      ];
      const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
      const totalQuantity = salesData.reduce((sum, item) => sum + item.quantity, 0);
      const topProducts = [...salesData].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      const dailySales = [
        { day: 'Lun', sales: 800 },
        { day: 'Mar', sales: 1200 },
        { day: 'Mié', sales: 900 },
        { day: 'Jue', sales: 1500 },
        { day: 'Vie', sales: 2000 },
        { day: 'Sáb', sales: 1800 },
        { day: 'Dom', sales: 1000 },
      ];
      const categoryData = [
        { name: 'Suplementos', percentage: 60, value: 3150 },
        { name: 'Preparados', percentage: 40, value: 1920 },
      ];
      return { salesData, totalRevenue, totalQuantity, topProducts, dailySales, categoryData };
    }

    case 'transaction-history': {
      // Datos simulados para historial de movimientos
      const transactionsData = [
        { id: '1', date: '2024-05-15', type: 'sale', description: 'Venta de Proteína Whey x2', amount: 2400, category: 'Suplementos', reference: 'Venta #1234' },
        { id: '2', date: '2024-05-16', type: 'expense', description: 'Compra de empaques', amount: -120, category: 'Inventario', reference: 'Factura #5678' },
        { id: '3', date: '2024-05-17', type: 'sale', description: 'Venta de Batidos x5', amount: 600, category: 'Preparados', reference: 'Venta #1235' },
        { id: '4', date: '2024-05-18', type: 'expense', description: 'Pago de electricidad', amount: -150, category: 'Servicios', reference: 'Recibo #9012' },
        { id: '5', date: '2024-05-19', type: 'adjustment', description: 'Ajuste de inventario - Proteína', amount: -300, category: 'Inventario' },
        { id: '6', date: '2024-05-20', type: 'sale', description: 'Venta de BCAA x3', amount: 1800, category: 'Suplementos', reference: 'Venta #1236' },
        { id: '7', date: '2024-05-21', type: 'expense', description: 'Pago de nómina', amount: -2000, category: 'Nómina', reference: 'Transferencia #3456' },
        { id: '8', date: '2024-05-22', type: 'sale', description: 'Venta de Waffles x10', amount: 900, category: 'Preparados', reference: 'Venta #1237' },
        { id: '9', date: '2024-05-23', type: 'expense', description: 'Compra de ingredientes', amount: -500, category: 'Inventario', reference: 'Factura #5679' },
        { id: '10', date: '2024-05-24', type: 'adjustment', description: 'Ajuste de inventario - Vasos', amount: -100, category: 'Inventario' }
      ];
      return { transactionsData };
    }

    default:
      return { message: 'Tipo de reporte no encontrado' };
  }
}

router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'executive-summary';
    const period = req.query.period || 'monthly';
    const reportData = await getReportData(type, period);
    res.json(reportData);
  } catch (error) {
    console.error('Error obteniendo datos del reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
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

