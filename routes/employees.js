const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Club = require('../models/Club');

// Obtener empleados por club
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const employees = await Employee.find({ club: clubId });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// Crear empleado - ahora recibe el clubId del body
router.post('/', async (req, res) => {
    try {
      const { name, role, phone, email, club } = req.body;
      
      // Verifica que el club existe
      const clubExists = await Club.findById(club);
      if (!clubExists) {
        return res.status(404).json({ error: 'Club no encontrado' });
      }
  
      const newEmployee = new Employee({ name, role, phone, email, club });
      await newEmployee.save();
      res.status(201).json(newEmployee);
    } catch (error) {
      res.status(500).json({ error: 'Error al crear empleado' });
    }
});

// Actualizar empleado
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedEmployee = await Employee.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// Eliminar empleado
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

module.exports = router;
