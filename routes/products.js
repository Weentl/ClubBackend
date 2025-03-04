// routes/products.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const Club = require('../models/Club'); // Asegúrate de importar el modelo Club



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

router.use(express.json());

// Endpoint para crear un producto (con subida de imagen opcional)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, type, description, purchase_price, sale_price, club } = req.body;
    if (!club) {
      return res.status(400).json({ message: 'El club es requerido' });
    }
    let image_url = '';
    if (req.file) {
      image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const productData = {
      name,
      category,
      type,
      description,
      purchase_price: parseFloat(purchase_price),
      sale_price: parseFloat(sale_price),
      image_url,
      club,
    };
    // Creamos el producto para el club actual
    const product = new Product(productData);
    await product.save();

    // Lógica de duplicado: si el club actual es el principal,
    // copiamos el producto a los demás clubes del usuario.
    const currentClub = await Club.findById(club);
    if (currentClub && currentClub.isMain) {
      // Buscamos los demás clubes del usuario (excluyendo el principal)
      const otherClubs = await Club.find({ user: currentClub.user, _id: { $ne: currentClub._id } });
      for (const otherClub of otherClubs) {
        const productCopy = new Product({
          ...productData,
          club: otherClub._id,
        });
        await productCopy.save();
      }
    }

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear el producto' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar el producto' });
  }
});

// Endpoint para editar un producto
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, type, description, purchase_price, sale_price } = req.body;
    const updateData = {
      name,
      category,
      type,
      description,
      purchase_price: parseFloat(purchase_price),
      sale_price: parseFloat(sale_price)
    };

    if (req.file) {
      updateData.image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el producto' });
  }
});

module.exports = router;

// Endpoint para obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { club } = req.query;
    if (!club) {
      return res.status(400).json({ message: 'El club es requerido' });
    }
    const products = await Product.find({ club }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los productos' });
  }
});

module.exports = router;
