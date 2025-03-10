// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  }
  
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
