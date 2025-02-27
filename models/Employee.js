const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  is_active: { type: Boolean, default: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Propiedad virtual para exponer el ID en JSON
EmployeeSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

EmployeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
