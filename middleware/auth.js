const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado, token faltante' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({ error: 'No autorizado, usuario no encontrado' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    
    // Manejo específico para token expirado
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expirado',
        solution: 'Usa el endpoint /api/auth/refresh-token con tu refresh token para obtener un nuevo token',
        expiredAt: err.expiredAt
      });
    }
    
    // Para otros errores de JWT
    return res.status(401).json({ 
      error: 'Token inválido',
      details: err.message 
    });
  }
};

module.exports = { authenticateToken };