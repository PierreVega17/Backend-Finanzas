require('dotenv').config();
require('express-async-errors');
//prueba
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

// Configuración mejorada de CORS
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:5173',
  'https://tu-frontend-en-render.onrender.com' // Agrega aquí tu URL de producción
].filter(Boolean); // Filtra valores undefined

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Para navegadores antiguos
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// ==================== RUTAS ====================

// Ruta raíz para verificación de salud
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'running',
    message: 'API de Finanzas funcionando correctamente',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Endpoint de verificación de salud más completo
app.get('/health', (req, res) => {
  const status = {
    status: 'up',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };
  res.status(200).json(status);
});

// Rutas de la API
if (authRoutes) app.use('/api/auth', authRoutes);
if (movementRoutes) app.use('/api/movements', authenticateToken, movementRoutes);
if (alertRoutes) app.use('/api/alerts', authenticateToken, alertRoutes);
if (oauthRoutes) app.use('/api/oauth', oauthRoutes);

// ==================== MANEJO DE ERRORES ====================

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      auth: '/api/auth',
      movements: '/api/movements',
      alerts: '/api/alerts',
      oauth: '/api/oauth'
    }
  });
});

// Middleware de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  
  // Manejo específico para errores de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Acceso prohibido por CORS',
      allowedOrigins: allowedOrigins
    });
  }

  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado'
  });
});

// ==================== CONEXIÓN A LA BASE DE DATOS Y SERVIDOR ====================

let server;

const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout después de 5 segundos
      socketTimeoutMS: 45000, // Cierra sockets después de 45s de inactividad
    });
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1); // Termina el proceso con error
  }
};

// Función para iniciar el servidor
const startServer = async () => {
  await connectDB();
  
  server = app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });

  // Manejo de errores del servidor
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`⚠️  El puerto ${PORT} está en uso`);
    } else {
      console.error('⚠️  Error del servidor:', error);
    }
    process.exit(1);
  });
};

// Función para cerrar el servidor y la conexión a la base de datos
const closeServer = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log('🛑 Servidor detenido');
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('🛑 Conexión a MongoDB cerrada');
  }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🔻 Recibida señal SIGTERM');
  closeServer().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('🔻 Recibida señal SIGINT (Ctrl+C)');
  closeServer().then(() => process.exit(0));
});

// Iniciar el servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, connectDB, closeServer, startServer };