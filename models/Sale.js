// models/Sale.js
const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  type: { type: String, enum: ['sealed', 'prepared'], required: true },
  custom_price: { type: Boolean, default: false },
});

const SaleSchema = new mongoose.Schema({
  items: [SaleItemSchema],
  total: { type: Number, required: true },
  status: { type: String, default: 'completed' },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sale', SaleSchema);
