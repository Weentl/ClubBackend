// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['owner', 'employee'], 
    default: 'owner'  // Por defecto, un usuario es dueño
  },
  businessType: { 
    type: String, 
    enum: ['supplements', 'food', 'other'], 
    default: 'supplements' 
  },
  acceptedTerms: { type: Boolean, required: true },
  isFirstLogin: { type: Boolean, default: true },
  productTypes: [{ type: String }],
  initialGoal: { type: String },
  resetCode: { type: String },
  resetCodeExpiration: { type: Date },
  // Nuevos campos para la configuración de la cuenta
  phone: { type: String, default: '' },
  profileImage: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);





