const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env from backend directory (works when deployed/started from any cwd)
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Remove duplicates and normalize origins (remove trailing slashes)
const normalizedOrigins = [...new Set(allowedOrigins.map(o => o.replace(/\/$/, '')))];

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin (curl, Postman, etc.)
  
  // Remove trailing slash for comparison
  const normalizedOrigin = origin.replace(/\/$/, '');
  
  // Exact match
  if (normalizedOrigins.includes(normalizedOrigin)) {
    return true;
  }
  
  // Allow any cronberry.com subdomain (for flexibility)
  if (normalizedOrigin.match(/^https?:\/\/([a-zA-Z0-9-]+\.)*cronberry\.com$/)) {
    return true;
  }
  
  return false;
};

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      console.log(`❌ CORS: Rejected origin: ${origin}`);
      console.log(`✅ CORS: Allowed origins:`, normalizedOrigins);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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

// Health check (no DB required - use for load balancer / proxy)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Cronberry Assets Tracker API is running' });
});

// GET /api - root API info (prevents 502 when proxy hits /api)
app.get('/api', (req, res) => {
  res.json({
    message: 'Cronberry Assets Tracker API',
    version: '1.0',
    docs: '/api',
    endpoints: {
      auth: '/api/auth',
      health: '/health',
      assets: '/api/assets',
      employees: '/api/employees',
      assignments: '/api/assignments',
      dashboard: '/api/dashboard',
    },
  });
});

// CORS test endpoint (for debugging)
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CORS is working correctly',
    origin: req.headers.origin || 'none',
    allowedOrigins: normalizedOrigins,
    isAllowed: isOriginAllowed(req.headers.origin)
  });
});

// 404 - catch all unmatched routes (prevents hanging requests → 502)
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found', path: req.path });
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
  console.log(`🔑 JWT_SECRET:`, process.env.JWT_SECRET ? 'set' : 'NOT SET (login will fail)');
  console.log(`🗄️  DB_HOST:`, process.env.DB_HOST || 'not set');
  console.log();
});

module.exports = app;