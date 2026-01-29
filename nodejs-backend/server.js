const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware - allow frontend origins (localhost + production)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://assetmanagement.cronberry.com',
  'http://assetmanagement.cronberry.com', // Support HTTP as well
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
];

// Remove duplicates and normalize origins
const normalizedOrigins = [...new Set(allowedOrigins)];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check exact match
    if (normalizedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging (remove in production if needed)
    console.log(`CORS: Rejected origin: ${origin}`);
    console.log(`CORS: Allowed origins:`, normalizedOrigins);
    
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Request logging middleware (for debugging CORS issues)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.path.includes('/api/')) {
    console.log(`[${req.method}] ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const assetsRoutes = require('./routes/assets');
const assignmentsRoutes = require('./routes/assignments');
const dashboardRoutes = require('./routes/dashboard');
const searchRoutes = require('./routes/search');
const simRoutes = require('./routes/sim-connections');
const pendingReturnsRoutes = require('./routes/pending-returns');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/global-search', searchRoutes);
app.use('/api/sim-connections', simRoutes);
app.use('/api/pending-returns', pendingReturnsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Cronberry Assets Tracker API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ detail: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 CORS enabled for origins:`, normalizedOrigins);
  console.log(`📝 CORS_ORIGIN env:`, process.env.CORS_ORIGIN || 'not set');
  console.log();
});

module.exports = app;