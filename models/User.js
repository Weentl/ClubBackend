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
  isFirstLogin: { type: Boolean, default: true },
  // Se mantiene productTypes y initialGoal, pero se elimina address
  productTypes: [{ type: String }],
  initialGoal: { type: String },
  // Campos para el reseteo de contraseña
  resetCode: { type: String },
  resetCodeExpiration: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);




