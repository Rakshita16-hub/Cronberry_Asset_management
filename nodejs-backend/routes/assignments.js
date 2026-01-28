const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Get all assignments
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const [assignments] = await db.query(
      'SELECT * FROM assignments ORDER BY id DESC'
    );
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ detail: 'Failed to fetch assignments' });
  }
});

// Create assignment
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { 
      employee_id, 
      asset_id, 
      assigned_date, 
      return_date, 
      asset_return_condition, 
      remarks,
      sim_provider,
      sim_mobile_number,
      sim_type,
      sim_ownership,
      sim_purpose
    } = req.body;

    // Validate required fields
    if (!employee_id || !asset_id || !assigned_date) {
      return res.status(400).json({ detail: 'Employee ID, Asset ID, and Assigned Date are required' });
    }

    // Fetch employee details
    const [employees] = await db.query(
      'SELECT employee_id, full_name FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (employees.length === 0) {
      return res.status(400).json({ detail: 'Employee not found' });
    }

    const employee = employees[0];

    // Fetch asset details
    const [assets] = await db.query(
      'SELECT asset_id, asset_name, status FROM assets WHERE asset_id = ?',
      [asset_id]
    );

    if (assets.length === 0) {
      return res.status(400).json({ detail: 'Asset not found' });
    }

    const asset = assets[0];

    // Check if asset is already assigned
    if (asset.status === 'Assigned') {
      // Check if there's an existing active assignment for this asset
      const [existingAssignments] = await db.query(
        'SELECT * FROM assignments WHERE asset_id = ? AND return_date IS NULL',
        [asset_id]
      );

      if (existingAssignments.length > 0) {
        return res.status(400).json({ 
          detail: 'Asset is already assigned to another employee',
          existing_assignment: existingAssignments[0]
        });
      }
    }

    // Generate assignment_id
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM assignments');
    const assignment_id = `ASG${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Create assignment
    await db.query(
      'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date, return_date, asset_return_condition, remarks, sim_provider, sim_mobile_number, sim_type, sim_ownership, sim_purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        assignment_id,
        employee.employee_id,
        employee.full_name,
        asset.asset_id,
        asset.asset_name,
        assigned_date,
        return_date || null,
        asset_return_condition || null,
        remarks || null,
        sim_provider || null,
        sim_mobile_number || null,
        sim_type || null,
        sim_ownership || null,
        sim_purpose || null
      ]
    );

    // Update asset status and condition based on return_date and asset_return_condition
    const assetUpdateFields = [];
    const assetUpdateValues = [];

    // Update asset status
    if (return_date && return_date !== null) {
      // If return_date is set, asset should be "Available"
      assetUpdateFields.push('status = ?');
      assetUpdateValues.push('Available');
    } else {
      // Otherwise, asset should be "Assigned"
      assetUpdateFields.push('status = ?');
      assetUpdateValues.push('Assigned');
    }

    // Update asset condition_status based on asset_return_condition
    if (asset_return_condition === 'Damaged' || asset_return_condition === 'Needs Repair') {
      assetUpdateFields.push('condition_status = ?');
      assetUpdateValues.push('Damaged');
    } else if (asset_return_condition === 'Good') {
      assetUpdateFields.push('condition_status = ?');
      assetUpdateValues.push('Good');
    }

    // Update asset
    assetUpdateValues.push(asset_id);
    await db.query(
      `UPDATE assets SET ${assetUpdateFields.join(', ')} WHERE asset_id = ?`,
      assetUpdateValues
    );

    // Fetch created assignment
    const [createdAssignment] = await db.query(
      'SELECT * FROM assignments WHERE assignment_id = ?',
      [assignment_id]
    );

    res.status(201).json(createdAssignment[0]);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ detail: 'Failed to create assignment', error: error.message });
  }
});

// Update assignment
router.put('/:assignment_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const { 
      employee_id, 
      asset_id, 
      assigned_date, 
      return_date, 
      asset_return_condition, 
      remarks,
      sim_provider,
      sim_mobile_number,
      sim_type,
      sim_ownership,
      sim_purpose
    } = req.body;

    // Fetch current assignment to get asset_id if not provided in request
    const [currentAssignment] = await db.query(
      'SELECT asset_id FROM assignments WHERE assignment_id = ?',
      [assignment_id]
    );

    if (currentAssignment.length === 0) {
      return res.status(404).json({ detail: 'Assignment not found' });
    }

    const currentAssetId = asset_id || currentAssignment[0].asset_id;

    // Fetch employee name if employee_id is provided
    let employee_name = null;
    if (employee_id) {
      const [employee] = await db.query(
        'SELECT full_name FROM employees WHERE employee_id = ?',
        [employee_id]
      );
      if (employee.length === 0) {
        return res.status(400).json({ detail: 'Employee not found' });
      }
      employee_name = employee[0].full_name;
    }

    // Fetch asset name if asset_id is provided
    let asset_name = null;
    if (asset_id) {
      const [asset] = await db.query(
        'SELECT asset_name FROM assets WHERE asset_id = ?',
        [asset_id]
      );
      if (asset.length === 0) {
        return res.status(400).json({ detail: 'Asset not found' });
      }
      asset_name = asset[0].asset_name;
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (employee_id) {
      updateFields.push('employee_id = ?');
      updateValues.push(employee_id);
    }
    if (employee_name) {
      updateFields.push('employee_name = ?');
      updateValues.push(employee_name);
    }
    if (asset_id) {
      updateFields.push('asset_id = ?');
      updateValues.push(asset_id);
    }
    if (asset_name) {
      updateFields.push('asset_name = ?');
      updateValues.push(asset_name);
    }
    if (assigned_date !== undefined) {
      updateFields.push('assigned_date = ?');
      updateValues.push(assigned_date);
    }
    if (return_date !== undefined) {
      updateFields.push('return_date = ?');
      updateValues.push(return_date || null);
    }
    if (asset_return_condition !== undefined) {
      updateFields.push('asset_return_condition = ?');
      updateValues.push(asset_return_condition || null);
    }
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks || null);
    }
    if (sim_provider !== undefined) {
      updateFields.push('sim_provider = ?');
      updateValues.push(sim_provider || null);
    }
    if (sim_mobile_number !== undefined) {
      updateFields.push('sim_mobile_number = ?');
      updateValues.push(sim_mobile_number || null);
    }
    if (sim_type !== undefined) {
      updateFields.push('sim_type = ?');
      updateValues.push(sim_type || null);
    }
    if (sim_ownership !== undefined) {
      updateFields.push('sim_ownership = ?');
      updateValues.push(sim_ownership || null);
    }
    if (sim_purpose !== undefined) {
      updateFields.push('sim_purpose = ?');
      updateValues.push(sim_purpose || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ detail: 'No fields to update' });
    }

    updateValues.push(assignment_id);

    const [result] = await db.query(
      `UPDATE assignments SET ${updateFields.join(', ')} WHERE assignment_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Assignment not found' });
    }

    // Update asset status and condition based on return_date and asset_return_condition
    const assetUpdateFields = [];
    const assetUpdateValues = [];

    // If return_date is set (not null), set asset status to "Available"
    if (return_date !== undefined && return_date !== null) {
      assetUpdateFields.push('status = ?');
      assetUpdateValues.push('Available');
    }

    // Update asset condition_status based on asset_return_condition
    if (asset_return_condition === 'Damaged' || asset_return_condition === 'Needs Repair') {
      assetUpdateFields.push('condition_status = ?');
      assetUpdateValues.push('Damaged');
    } else if (asset_return_condition === 'Good') {
      assetUpdateFields.push('condition_status = ?');
      assetUpdateValues.push('Good');
    }

    // Update asset if there are fields to update
    if (assetUpdateFields.length > 0) {
      assetUpdateValues.push(currentAssetId);
      await db.query(
        `UPDATE assets SET ${assetUpdateFields.join(', ')} WHERE asset_id = ?`,
        assetUpdateValues
      );
    }

    // Fetch updated assignment
    const [updated] = await db.query(
      'SELECT * FROM assignments WHERE assignment_id = ?',
      [assignment_id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ detail: 'Failed to update assignment', error: error.message });
  }
});

// Delete assignment
router.delete('/:assignment_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const [result] = await db.query('DELETE FROM assignments WHERE assignment_id = ?', [assignment_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Assignment not found' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ detail: 'Failed to delete assignment', error: error.message });
  }
});

// Download template
router.get('/template', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assignments Template');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 30 },
      { header: 'Asset ID', key: 'asset_id', width: 15 },
      { header: 'Asset Name', key: 'asset_name', width: 30 },
      { header: 'Assigned Date', key: 'assigned_date', width: 15 },
      { header: 'Return Date', key: 'return_date', width: 15 },
      { header: 'Return Condition', key: 'asset_return_condition', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 40 },
      { header: 'SIM Provider', key: 'sim_provider', width: 20 },
      { header: 'SIM Mobile Number', key: 'sim_mobile_number', width: 20 },
      { header: 'SIM Type', key: 'sim_type', width: 15 },
      { header: 'SIM Ownership', key: 'sim_ownership', width: 20 },
      { header: 'SIM Purpose', key: 'sim_purpose', width: 40 }
    ];

    worksheet.addRow({
      employee_id: 'EMP0001',
      employee_name: 'John Doe',
      asset_id: 'AST0001',
      asset_name: 'Dell Laptop',
      assigned_date: '2024-01-15',
      return_date: null,
      asset_return_condition: null,
      remarks: 'Assigned for work from home',
      sim_provider: 'Airtel',
      sim_mobile_number: '9876543210',
      sim_type: 'Data',
      sim_ownership: 'Company',
      sim_purpose: 'Official use'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=assignments_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ detail: 'Failed to download template' });
  }
});

module.exports = router;
