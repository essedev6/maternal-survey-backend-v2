const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Enhanced CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : [
      'http://localhost:5173',
      'https://maternal-survey.vercel.app'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => {
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      return normalizedOrigin === normalizedAllowed;
    })) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route imports (with error handling)
const initRoutes = async () => {
  try {
    const surveyRoutes = require('./routes/surveyRoutes');
    const authRoutes = require('./routes/authRoutes');
    const analyticsRoutes = require('./routes/analyticsRoutes');
    const responseRoute = require('./routes/responseRoute');

    app.use('/api/v1/responses', surveyRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);
    app.use('/api/v1/adv', analyticsRoutes);
    app.use('/api/v1/surveys', responseRoute);

    console.log('All routes initialized successfully');
  } catch (err) {
    console.error('❌ Route initialization failed:', err);
    process.exit(1);
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins,
      activeOrigin: req.headers.origin
    }
  });
});

// Basic welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Maternal Survey API',
    version: '1.0.0',
    documentation: 'https://github.com/your-repo/docs'
  });
});

// Initialize routes
initRoutes();

// Error handling middleware
app.use(errorHandler.errorHandler);

// Server setup
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server running in ${process.env.NODE_ENV || 'development'} mode
  📡 Port: ${PORT}
  🌐 CORS Enabled for: ${allowedOrigins.join(', ')}
  🗄️ Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}
  ⏰ Started at: ${new Date().toLocaleString()}
  `);
});

// Handle process events
process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❗ Uncaught Exception:', err.message);
  server.close(() => process.exit(1));
});