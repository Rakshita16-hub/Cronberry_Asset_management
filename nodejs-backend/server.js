const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
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
  console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;