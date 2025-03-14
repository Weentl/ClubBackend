// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['inventory', 'services', 'payroll', 'logistics', 'other']
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  supplier: {
    type: String,
    default: ''
  },
  is_recurring: {
    type: Boolean,
    default: false
  },
  receipt_url: {
    type: String,
    default: ''
  },
  club: {
    type: String,
    required: true
  },
  employee: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);


