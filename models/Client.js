
const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  club_id: { type: String, required: true }, // Campo para el club
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  type: { type: String, enum: ['regular', 'occasional', 'wholesale'], required: true },
  total_spent: { type: Number, default: 0 },
  last_purchase: { type: Date },
  preferences: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', ClientSchema);
 