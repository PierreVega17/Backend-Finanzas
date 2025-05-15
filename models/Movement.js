const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['$', 'S/', '€', '£', 'R$'],
    default: '$'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    maxlength: 200,
    trim: true
  }
});

const Movement = mongoose.model('Movement', movementSchema);

module.exports = Movement;
