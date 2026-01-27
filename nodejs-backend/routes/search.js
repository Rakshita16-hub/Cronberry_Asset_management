const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// Search endpoint
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json({ employees: [], assets: [], assignments: [] });
    }

    const searchTerm = `%${q}%`;

    // Search employees
    const [employees] = await db.query(
      `SELECT employee_id, full_name, department, designation, email 
       FROM employees 
       WHERE full_name LIKE ? OR employee_id LIKE ? OR email LIKE ? OR department LIKE ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Search assets
    const [assets] = await db.query(
      `SELECT asset_id, asset_name, category, brand, serial_number, status 
       FROM assets 
       WHERE asset_name LIKE ? OR asset_id LIKE ? OR serial_number LIKE ? OR category LIKE ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Search assignments
    const [assignments] = await db.query(
      `SELECT assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date 
       FROM assignments 
       WHERE employee_name LIKE ? OR asset_name LIKE ? OR assignment_id LIKE ?`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.json({ employees, assets, assignments });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ detail: 'Failed to perform search' });
  }
});

module.exports = router;
