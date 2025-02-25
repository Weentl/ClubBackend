// models/InventoryMovement.js
const mongoose = require('mongoose');

const InventoryMovementSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['use_in_prepared', 'gift', 'damaged', 'restock', 'purchase', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  notes: String,
  purchase_price: Number,
  sale_price: Number
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('InventoryMovement', InventoryMovementSchema);
