// routes/products.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');

// Configuración de multer para almacenar archivos en la carpeta "uploads"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Asegúrate de que la carpeta "uploads" exista
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// Endpoint para crear un producto (con subida de imagen opcional)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, type, description, purchase_price, sale_price } = req.body;
    let image_url = '';
    if (req.file) {
      image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const product = new Product({
      name,
      category,
      type,
      description,
      purchase_price: parseFloat(purchase_price),
      sale_price: parseFloat(sale_price),
      image_url,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear el producto' });
  }
});

// Endpoint para obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los productos' });
  }
});

module.exports = router;
