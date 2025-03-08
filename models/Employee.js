// models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Nuevo campo para las credenciales de acceso
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  is_active: { type: Boolean, default: true },
  permissions: { type: [String], default: ['sales'] },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Propiedad virtual para exponer el ID en formato hexadecimal
EmployeeSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Incluir virtuales en JSON
EmployeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', EmployeeSchema);


