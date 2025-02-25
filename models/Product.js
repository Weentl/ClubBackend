// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['prepared', 'sealed'], required: true },
    description: { type: String },
    purchase_price: { type: Number, required: true },
    sale_price: { type: Number, required: true },
    image_url: { type: String },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);

