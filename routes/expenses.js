// routes/expenses.js
const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// Obtener gastos (filtrados por club si se proporciona)
router.get('/', async (req, res) => {
  try {
    const { club } = req.query;
    const filter = club ? { club } : {};
    const expenses = await Expense.find(filter);
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

// Crear un nuevo gasto
router.post('/', async (req, res) => {
  try {
    const { amount, category, date, description, supplier, is_recurring, receipt_url, club } = req.body;
    if (!club) {
      return res.status(400).json({ error: 'El club es requerido' });
    }
    const expense = new Expense({
      amount,
      category,
      date,
      description,
      supplier,
      is_recurring,
      receipt_url,
      club
    });
    const savedExpense = await expense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Error creating expense' });
  }
});

// Actualizar un gasto existente
router.put('/:id', async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { amount, category, date, description, supplier, is_recurring, receipt_url, club } = req.body;
    if (!club) {
      return res.status(400).json({ error: 'El club es requerido' });
    }
    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      { amount, category, date, description, supplier, is_recurring, receipt_url, club },
      { new: true }
    );
    if (!updatedExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Error updating expense' });
  }
});

// Eliminar un gasto
router.delete('/:id', async (req, res) => {
  try {
    const expenseId = req.params.id;
    const deletedExpense = await Expense.findByIdAndDelete(expenseId);
    if (!deletedExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Error deleting expense' });
  }
});

module.exports = router;


