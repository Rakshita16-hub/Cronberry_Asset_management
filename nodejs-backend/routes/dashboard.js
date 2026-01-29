const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    // Helper function to safely execute queries
    const safeQuery = async (query, defaultResult) => {
      try {
        const { rows } = await db.query(query);
        return rows[0] || defaultResult;
      } catch (error) {
        console.warn('Query failed (table may not exist):', error.message);
        return defaultResult;
      }
    };

    // Get employee statistics
    const employeeStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_employees,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_employees,
        SUM(CASE WHEN status = 'Exit' THEN 1 ELSE 0 END) as exited_employees
      FROM employees`,
      { total_employees: 0, active_employees: 0, exited_employees: 0 }
    );

    // Get asset statistics
    const assetStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_assets,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_assets,
        SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned_assets,
        SUM(CASE WHEN status = 'Under Repair' THEN 1 ELSE 0 END) as under_repair_assets
      FROM assets`,
      { total_assets: 0, available_assets: 0, assigned_assets: 0, under_repair_assets: 0 }
    );

    // Get assignment statistics
    const assignmentStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN return_date IS NULL THEN 1 END) as active_assignments
      FROM assignments`,
      { total_assignments: 0, active_assignments: 0 }
    );

    // Get SIM connection statistics
    const simStats = await safeQuery(
      `SELECT 
        COUNT(*) as total_sim_connections,
        SUM(CASE WHEN connection_status = 'Active' THEN 1 ELSE 0 END) as active_sim_connections,
        SUM(CASE WHEN sim_status = 'Assigned' THEN 1 ELSE 0 END) as assigned_sim_connections,
        SUM(CASE WHEN sim_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_sim_connections
      FROM sim_connections`,
      { total_sim_connections: 0, active_sim_connections: 0, assigned_sim_connections: 0, in_stock_sim_connections: 0 }
    );

    // Return flattened structure expected by frontend
    res.json({
      total_assets: Number(assetStats.total_assets) || 0,
      assigned_assets: Number(assetStats.assigned_assets) || 0,
      available_assets: Number(assetStats.available_assets) || 0,
      total_employees: Number(employeeStats.total_employees) || 0,
      // Additional stats for future use
      under_repair_assets: Number(assetStats.under_repair_assets) || 0,
      active_employees: Number(employeeStats.active_employees) || 0,
      exited_employees: Number(employeeStats.exited_employees) || 0,
      total_assignments: Number(assignmentStats.total_assignments) || 0,
      active_assignments: Number(assignmentStats.active_assignments) || 0,
      total_sim_connections: Number(simStats.total_sim_connections) || 0,
      active_sim_connections: Number(simStats.active_sim_connections) || 0,
      assigned_sim_connections: Number(simStats.assigned_sim_connections) || 0,
      in_stock_sim_connections: Number(simStats.in_stock_sim_connections) || 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ detail: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;
