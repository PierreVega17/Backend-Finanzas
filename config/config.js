const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });


const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/finanzas',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-for-testing',
  NODE_ENV: process.env.NODE_ENV || 'development'
};



module.exports = config; 