const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Alert = require('../models/Alert');
const Movement = require('../models/Movement');

// Obtener alertas usuario autenticado
router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ user: req.user._id });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

// Endpoint de prueba para verificar alertas
router.get('/check', async (req, res, next) => {
  try {
    // Obtener todas las alertas activas del usuario
    const alerts = await Alert.find({ 
      user: req.user._id,
      active: true 
    });

    const results = [];

    for (const alert of alerts) {
      // Calcular el período de tiempo según la frecuencia
      const now = new Date();
      let startDate = new Date();
      
      switch (alert.frequency) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Obtener los movimientos del período
      const movements = await Movement.find({
        user: req.user._id,
        date: { $gte: startDate, $lte: now },
        type: 'expense'
      });

      // Calcular el total de gastos
      const totalExpenses = movements.reduce((sum, mov) => sum + mov.amount, 0);

      // Verificar si se supera el umbral
      if (totalExpenses > alert.threshold) {
        results.push({
          alert,
          triggered: true,
          totalExpenses,
          period: {
            start: startDate,
            end: now
          }
        });
      }
    }

    res.json({
      alertsChecked: alerts.length,
      triggeredAlerts: results
    });
  } catch (err) {
    next(err);
  }
});

// Crear alerta
router.post(
  '/',
  [
    body('threshold').isFloat({ gt: 0 }).withMessage('El umbral debe ser un número positivo'),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Frecuencia inválida')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { threshold, frequency } = req.body;

      const alert = new Alert({
        user: req.user._id,
        threshold,
        frequency
      });

      await alert.save();
      res.status(201).json(alert);
    } catch (err) {
      next(err);
    }
  }
);

// Actualizar alerta
router.put(
  '/:id',
  [
    body('threshold').optional().isFloat({ gt: 0 }).withMessage('El umbral debe ser un número positivo'),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Frecuencia inválida'),
    body('active').optional().isBoolean().withMessage('Activo debe ser booleano')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const alert = await Alert.findOne({ _id: req.params.id, user: req.user._id });
      if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });

      Object.assign(alert, req.body);
      await alert.save();
      res.json(alert);
    } catch (err) {
      next(err);
    }
  }
);

// Eliminar alerta
router.delete('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, user: req.user._id });
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });

    await alert.deleteOne();
    res.json({ message: 'Alerta eliminada' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;