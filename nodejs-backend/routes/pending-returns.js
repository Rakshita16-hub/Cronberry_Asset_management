const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// Get pending returns (assignments that haven't been returned yet)
// Returns data grouped by employee as expected by frontend
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { rows: pendingReturns } = await db.query(
      `SELECT 
        a.assignment_id,
        a.employee_id,
        a.employee_name,
        a.asset_id,
        a.asset_name,
        a.assigned_date,
        a.return_date,
        a.asset_return_condition,
        a.remarks,
        a.sim_provider,
        a.sim_mobile_number,
        a.sim_type,
        a.sim_ownership,
        a.sim_purpose,
        a.created_at,
        a.updated_at,
        e.email
      FROM assignments a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.return_date IS NULL 
        AND e.status = 'Exit'
      ORDER BY a.assigned_date ASC`
    );

    // Group by employee_id as expected by frontend
    const groupedByEmployee = {};
    
    pendingReturns.forEach(assignment => {
      const employeeId = assignment.employee_id;
      
      if (!groupedByEmployee[employeeId]) {
        groupedByEmployee[employeeId] = {
          employee_id: employeeId,
          employee_name: assignment.employee_name,
          email: assignment.email || '',
          assets: []
        };
      }
      
      groupedByEmployee[employeeId].assets.push({
        assignment_id: assignment.assignment_id,
        asset_id: assignment.asset_id,
        asset_name: assignment.asset_name,
        assigned_date: assignment.assigned_date,
        asset_return_condition: assignment.asset_return_condition,
        remarks: assignment.remarks,
        sim_provider: assignment.sim_provider,
        sim_mobile_number: assignment.sim_mobile_number,
        sim_type: assignment.sim_type,
        sim_ownership: assignment.sim_ownership,
        sim_purpose: assignment.sim_purpose
      });
    });

    // Convert to array format expected by frontend
    const result = Object.values(groupedByEmployee);
    res.json(result);
  } catch (error) {
    console.error('Get pending returns error:', error);
    res.status(500).json({ detail: 'Failed to fetch pending returns' });
  }
});

module.exports = router;
