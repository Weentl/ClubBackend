// models/InventoryMovement.js
const mongoose = require('mongoose');

const InventoryMovementSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['use_in_prepared', 'gift', 'damaged', 'restock', 'purchase', 'sale', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  notes: String,
  purchase_price: Number,
  sale_price: Number,
  sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('InventoryMovement', InventoryMovementSchema);
