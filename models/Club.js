// models/Club.js
const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
  clubName: { type: String, required: true },
  address: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isMain: { type: Boolean, default: false }  // true para el club principal
}, { timestamps: true });

module.exports = mongoose.model('Club', ClubSchema);

