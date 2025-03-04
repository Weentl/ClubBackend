const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta'; // Debe ser la misma clave que en routes/auth.js

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    console.log('token',token);

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, token no encontrado.' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET); // Remueve 'Bearer ' si es necesario
        req.userId = decoded.userId; // Agrega el userId al objeto request
        next(); // Continúa al siguiente middleware o ruta
    } catch (error) {
        res.status(401).json({ message: 'Token no válido.' });
    }
};

module.exports = authMiddleware;