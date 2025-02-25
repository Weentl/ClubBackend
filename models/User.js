// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  businessType: { 
    type: String, 
    enum: ['supplements', 'food', 'other'], 
    default: 'supplements' 
  },
  acceptedTerms: { type: Boolean, required: true },
  isFirstLogin: { type: Boolean, default: true }, // Nuevo campo
  businessName: { type: String },
  productTypes: [{ type: String }],
  address: { type: String },
  initialGoal: { type: String },
  clubs: [{
  clubName: { type: String },
  address: { type: String }
 }],
  // Campos para el reseteo de contraseña
  resetCode: { type: String },
  resetCodeExpiration: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
