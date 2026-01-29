const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    // Fail fast if server is misconfigured (avoids cryptic 500)
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      console.error('Login: JWT_SECRET is missing or too short in environment');
      return res.status(503).json({ detail: 'Server configuration error. Please contact support.' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    const token = jwt.sign(
      {
        sub: user.username,
        role: user.role,
        employee_id: user.employee_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      access_token: token,
      token_type: 'bearer',
      role: user.role,
      employee_id: user.employee_id
    });
  } catch (error) {
    // Log full error for debugging (check server logs when you get 500)
    console.error('Login error:', error.message || error);
    if (error.code) console.error('  Code:', error.code);

    // Database errors (connection refused, timeout, no table, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ detail: 'Database unavailable. Please try again later.' });
    }
    if (error.code && String(error.code).startsWith('42')) {
      // PostgreSQL error (e.g. 42P01 = undefined_table)
      return res.status(503).json({ detail: 'Database error. Please contact support.' });
    }

    // JWT or other errors
    res.status(500).json({ detail: 'Login failed' });
  }
});

// Get current user
router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

module.exports = router;