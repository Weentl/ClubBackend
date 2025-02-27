const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
  clubName: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  schedule: { type: String },
  logo_url: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isMain: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  sync_inventory: { type: Boolean, default: false },
  sales_goal: { type: Number, default: 0 },
  monthly_sales: { type: Number, default: 0 },
  employee_count: { type: Number, default: 0 },
  inventory_count: { type: Number, default: 0 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Propiedad virtual "id" para exponer _id en formato hexadecimal
ClubSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Virtual "name" con getter y setter.
// El getter devuelve clubName y el setter asigna el valor recibido a clubName.
ClubSchema.virtual('name')
  .get(function() {
    return this.clubName;
  })
  .set(function(value) {
    this.clubName = value;
  });

// Configura el toJSON para incluir las propiedades virtuales
ClubSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Club', ClubSchema);




