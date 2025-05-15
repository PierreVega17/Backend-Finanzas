const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Movement = require('../models/Movement');

// Obtener todos los movimientos del usuario autenticado, con filtros opcionales
router.get('/', async (req, res, next) => {
  try {
    const { year, month } = req.query;

    let filter = { user: req.user._id };
    if (year) {
      const start = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1);
      const end = month
        ? new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        : new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      
      filter.date = { $gte: start, $lte: end };
    }

    const movements = await Movement.find(filter).sort({ date: -1 });
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

// Crear nuevo movimiento
router.post(
  '/',
  [
    body('type').isIn(['income', 'expense']).withMessage('Tipo inválido'),
    body('amount').isFloat({ gt: 0 }).withMessage('Monto debe ser mayor a 0'),
    body('date').optional().isISO8601().withMessage('Fecha inválida'),
    body('category').optional().isString().isLength({ max: 50 }),
    body('description').optional().isString().isLength({ max: 200 }),
    body('currency').isIn(['$', 'S/', '€', '£', 'R$']).withMessage('Moneda inválida')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { type, amount, date, category, description, currency } = req.body;
      const movement = new Movement({
        user: req.user._id,
        type,
        amount,
        date: date || new Date(),
        category,
        description,
        currency: currency || '$'
      });

      await movement.save();
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }
);

// Actualizar movimiento (solo dueño)
router.put(
  '/:id',
  [
    body('type').optional().isIn(['income', 'expense']).withMessage('Tipo inválido'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Monto debe ser mayor a 0'),
    body('date').optional().isISO8601().withMessage('Fecha inválida'),
    body('category').optional().isString().isLength({ max: 50 }),
    body('description').optional().isString().isLength({ max: 200 }),
    body('currency').optional().isIn(['$', 'S/', '€', '£', 'R$']).withMessage('Moneda inválida')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const movement = await Movement.findOne({ _id: req.params.id, user: req.user._id });
      if (!movement) return res.status(404).json({ error: 'Movimiento no encontrado' });

      const updateData = { ...req.body };
      if (!updateData.currency) {
        delete updateData.currency; // No sobrescribir la moneda si no se proporciona
      }
      
      Object.assign(movement, updateData);
      await movement.save();
      res.json(movement);
    } catch (err) {
      next(err);
    }
  }
);

// Eliminar movimiento (solo dueño)
router.delete('/:id', async (req, res, next) => {
  try {
    const movement = await Movement.findOne({ _id: req.params.id, user: req.user._id });
    if (!movement) return res.status(404).json({ error: 'Movimiento no encontrado' });

    await movement.deleteOne();
    res.json({ message: 'Movimiento eliminado' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;