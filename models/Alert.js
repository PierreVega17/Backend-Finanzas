const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  threshold: {
    type: Number,
    required: true,
    min: 0
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  lastSent: {
    type: Date,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método para verificar si la alerta debe ser enviada
alertSchema.methods.shouldSend = function() {
  if (!this.active) return false;
  if (!this.lastSent) return true;

  const now = new Date();
  const last = new Date(this.lastSent);

  switch (this.frequency) {
    case 'daily':
      return now.getDate() !== last.getDate() || 
             now.getMonth() !== last.getMonth() ||
             now.getFullYear() !== last.getFullYear();
    case 'weekly':
      const weekDiff = Math.floor((now - last) / (1000 * 60 * 60 * 24 * 7));
      return weekDiff >= 1;
    case 'monthly':
      return now.getMonth() !== last.getMonth() || 
             now.getFullYear() !== last.getFullYear();
    default:
      return false;
  }
};

const Alert = mongoose.model('Alert', alertSchema);
module.exports = Alert;