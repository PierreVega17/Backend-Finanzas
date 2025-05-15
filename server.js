require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const { PORT, MONGODB_URI } = require('./config/config');



// Importar rutas
const authRoutes = require('./routes/auth');
const movementRoutes = require('./routes/movements');
const alertRoutes = require('./routes/alerts');
const oauthRoutes = require('./routes/oauth');

// Importar middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // URL del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 horas
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Verificar que las rutas existan antes de usarlas
if (authRoutes) app.use('/api/auth', authRoutes);
if (movementRoutes) app.use('/api/movements', authenticateToken, movementRoutes);
if (alertRoutes) app.use('/api/alerts', authenticateToken, alertRoutes);
if (oauthRoutes) app.use('/api/oauth', oauthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

let server;

const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  }
};

// Solo iniciar el servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  });
}

// Función para cerrar el servidor y la conexión a la base de datos
const closeServer = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close();
};

module.exports = { app, connectDB, closeServer };
