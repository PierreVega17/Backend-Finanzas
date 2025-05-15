const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Configuración de tokens (agrega esto al inicio)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutos para access token
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // 7 días para refresh token

// Registro usuario (actualizado)
router.post('/register', [
  body('name').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res, next) => {
  try {
    // ... (validaciones y creación de usuario igual que antes)

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET + '_REFRESH', { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    // Guardar refresh token en el usuario
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({ 
      token, 
      refreshToken,
      expiresIn: JWT_EXPIRES_IN 
    });
  } catch (error) {
    next(error);
  }
});

// Login usuario (actualizado)
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
], async (req, res, next) => {
  // 1. Validar campos con express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 2. Buscar usuario (¡con manejo explícito de null!)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' }); // Mensaje genérico por seguridad
    }

    // 3. Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 4. Generar tokens
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // 5. Actualizar refresh token en la DB
    user.refreshToken = refreshToken;
    await user.save();

    // 6. Responder
    res.json({ 
      token, 
      refreshToken,
      user: { id: user._id, email: user.email } // Datos seguros del usuario
    });

  } catch (error) {
    console.error('Error en login:', error);
    next(error); // Pasa al middleware de errores
  }
});

// Nuevo endpoint para refrescar token (agrega esto)
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });

    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + '_REFRESH');
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Refresh token inválido' });
    }

    // Generar nuevo token de acceso
    const newToken = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
      token: newToken,
      refreshToken, // Puedes optar por generar uno nuevo también
      expiresIn: JWT_EXPIRES_IN 
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Refresh token expirado, por favor inicie sesión nuevamente' });
    }
    next(error);
  }
});

module.exports = router;