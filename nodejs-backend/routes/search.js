const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// Search employees only (for assignments etc.)
router.get('/employees', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    const searchTerm = `%${q}%`;
    const { rows: employees } = await db.query(
      `SELECT employee_id, full_name, department, designation, email 
       FROM employees 
       WHERE full_name ILIKE $1 OR employee_id ILIKE $2 OR email ILIKE $3 OR department ILIKE $4`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    // Fetch assigned assets for each employee (only active assignments where return_date IS NULL)
    const employeesWithAssets = await Promise.all(
      employees.map(async (employee) => {
        const { rows: assignments } = await db.query(
          `SELECT assignment_id, asset_id, asset_name, assigned_date 
           FROM assignments 
           WHERE employee_id = $1 AND return_date IS NULL 
           ORDER BY assigned_date DESC`,
          [employee.employee_id]
        );
        
        return {
          ...employee,
          assigned_assets: assignments.map(assignment => ({
            assignment_id: assignment.assignment_id,
            asset_id: assignment.asset_id,
            asset_name: assignment.asset_name,
            assigned_date: assignment.assigned_date
          }))
        };
      })
    );
    
    res.json(employeesWithAssets);
  } catch (error) {
    console.error('Employee search error:', error);
    res.status(500).json({ detail: 'Failed to perform employee search' });
  }
});

// Search endpoint (employees, assets, assignments)
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json({ employees: [], assets: [], assignments: [] });
    }

    const searchTerm = `%${q}%`;

    // Search employees
    const { rows: employees } = await db.query(
      `SELECT employee_id, full_name, department, designation, email 
       FROM employees 
       WHERE full_name ILIKE $1 OR employee_id ILIKE $2 OR email ILIKE $3 OR department ILIKE $4`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Search assets
    const { rows: assets } = await db.query(
      `SELECT asset_id, asset_name, category, brand, serial_number, status 
       FROM assets 
       WHERE asset_name ILIKE $1 OR asset_id ILIKE $2 OR serial_number ILIKE $3 OR category ILIKE $4`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Search assignments
    const { rows: assignments } = await db.query(
      `SELECT assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date 
       FROM assignments 
       WHERE employee_name ILIKE $1 OR asset_name ILIKE $2 OR assignment_id ILIKE $3`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.json({ employees, assets, assignments });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ detail: 'Failed to perform search' });
  }
});

module.exports = router;
