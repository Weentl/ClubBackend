const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carga las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta'; // Mismo valor que en el login

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  console.log('Token recibido:', token);

  if (!token) {
    console.log('No se encontró token en la cabecera.');
    return res.status(401).json({ message: 'No autorizado, token no encontrado.' });
  }

  try {
    const tokenClean = token.replace('Bearer ', '');
    const decoded = jwt.verify(tokenClean, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('Error al verificar token:', error);
    res.status(401).json({ message: 'Token no válido.' });
  }
};

module.exports = authMiddleware;
