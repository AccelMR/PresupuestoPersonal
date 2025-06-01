import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import authRoutes from './routes/auths';
import categoryRoutes from './routes/categories';
import recurringTransactionRoutes from './routes/recurringTransactions';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Rutas básicas
app.get('/', (req, res) => {
  res.json({
    message: '🏦 API de Presupuesto Personal',
    version: '1.0.0',
    status: 'funcionando',
    endpoints: {
      health: '/health',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      categories: '/api/categories'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Ruta de prueba para verificar conexión a DB
app.get('/api/test-db', async (req, res) => {
  try {
    const admin = mongoose.connection.db?.admin();
    const result = await admin?.ping();
    res.json({
      message: 'Conexión a MongoDB exitosa',
      ping: result,
      database: mongoose.connection.name
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error conectando a MongoDB',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// TODO: Agregar rutas de la APIrecurringTransactionController
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recurring', recurringTransactionRoutes);

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Manejo de errores globales
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

// Iniciar servidor
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Base de datos: ${process.env.MONGODB_URI?.split('@')[1]?.split('/')[0]}`);
  });
};

startServer().catch(console.error);