const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Get all assignments
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { employee_id, asset_id, status } = req.query;
    
    let query = 'SELECT * FROM assignments';
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Filter by employee_id if provided
    if (employee_id && employee_id !== '' && employee_id !== 'all' && employee_id !== 'All') {
      conditions.push(`employee_id = $${paramIndex}`);
      params.push(employee_id);
      paramIndex++;
    }
    
    // Filter by asset_id if provided
    if (asset_id && asset_id !== '' && asset_id !== 'all' && asset_id !== 'All') {
      conditions.push(`asset_id = $${paramIndex}`);
      params.push(asset_id);
      paramIndex++;
    }
    
    // Filter by status: 'active' (return_date IS NULL) or 'returned' (return_date IS NOT NULL)
    if (status && status !== '' && status !== 'all' && status !== 'All') {
      if (status.toLowerCase() === 'active') {
        conditions.push(`return_date IS NULL`);
      } else if (status.toLowerCase() === 'returned') {
        conditions.push(`return_date IS NOT NULL`);
      }
    }
    
    // Add WHERE clause if there are any conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY id DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
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
    const employeesResult = await db.query(
      'SELECT employee_id, full_name FROM employees WHERE employee_id = $1',
      [employee_id]
    );

    if (employeesResult.rows.length === 0) {
      return res.status(400).json({ detail: 'Employee not found' });
    }

    const employee = employeesResult.rows[0];

    // Fetch asset details
    const assetsResult = await db.query(
      'SELECT asset_id, asset_name, status FROM assets WHERE asset_id = $1',
      [asset_id]
    );

    if (assetsResult.rows.length === 0) {
      return res.status(400).json({ detail: 'Asset not found' });
    }

    const asset = assetsResult.rows[0];

    // Check if asset is already assigned
    if (asset.status === 'Assigned') {
      // Check if there's an existing active assignment for this asset
      const existingAssignmentsResult = await db.query(
        'SELECT * FROM assignments WHERE asset_id = $1 AND return_date IS NULL',
        [asset_id]
      );

      if (existingAssignmentsResult.rows.length > 0) {
        return res.status(400).json({ 
          detail: 'Asset is already assigned to another employee',
          existing_assignment: existingAssignmentsResult.rows[0]
        });
      }
    }

    // Generate assignment_id
    const countResult = await db.query('SELECT COUNT(*) AS count FROM assignments');
    const currentCount = Number(countResult.rows[0]?.count) || 0;
    const assignment_id = `ASG${String(currentCount + 1).padStart(4, '0')}`;

    // Create assignment
    await db.query(
      'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date, return_date, asset_return_condition, remarks, sim_provider, sim_mobile_number, sim_type, sim_ownership, sim_purpose) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
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
      assetUpdateFields.push('status = $' + (assetUpdateValues.length + 1));
      assetUpdateValues.push('Available');
    } else {
      // Otherwise, asset should be "Assigned"
      assetUpdateFields.push('status = $' + (assetUpdateValues.length + 1));
      assetUpdateValues.push('Assigned');
    }

    // Update asset condition_status based on asset_return_condition
    if (asset_return_condition === 'Damaged' || asset_return_condition === 'Needs Repair') {
      assetUpdateFields.push('condition_status = $' + (assetUpdateValues.length + 1));
      assetUpdateValues.push('Damaged');
    } else if (asset_return_condition === 'Good') {
      assetUpdateFields.push('condition_status = $' + (assetUpdateValues.length + 1));
      assetUpdateValues.push('Good');
    }

    // Update asset
    assetUpdateValues.push(asset_id);
    await db.query(
      `UPDATE assets SET ${assetUpdateFields.join(', ')} WHERE asset_id = $${assetUpdateValues.length}`,
      assetUpdateValues
    );

    // Fetch created assignment
    const createdAssignmentResult = await db.query(
      'SELECT * FROM assignments WHERE assignment_id = $1',
      [assignment_id]
    );

    res.status(201).json(createdAssignmentResult.rows[0]);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ detail: 'Failed to create assignment', error: error.message });
  }
});

// Get unique employee IDs from assignments (for filtering)
router.get('/employees', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT a.employee_id, a.employee_name 
       FROM assignments a 
       ORDER BY a.employee_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get assignment employees error:', error);
    res.status(500).json({ detail: 'Failed to fetch employees' });
  }
});

// Get unique asset IDs from assignments (for filtering)
router.get('/assets', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT a.asset_id, a.asset_name 
       FROM assignments a 
       ORDER BY a.asset_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get assignment assets error:', error);
    res.status(500).json({ detail: 'Failed to fetch assets' });
  }
});

// Update assignment (HR and Admin can edit until asset is returned; returned = view-only)
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

    // Fetch current assignment to get asset_id and return_date if not provided in request
    const currentAssignmentResult = await db.query(
      'SELECT asset_id, return_date FROM assignments WHERE assignment_id = $1',
      [assignment_id]
    );

    if (currentAssignmentResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Assignment not found' });
    }

    const currentAssetId = asset_id || currentAssignmentResult.rows[0].asset_id;
    const currentReturnDate = currentAssignmentResult.rows[0].return_date;
    const isReturned = currentAssignmentResult.rows[0].return_date != null;
    const isAdmin = req.user.role === 'Admin';

    // If assignment has been returned, restrict editing based on user role
    if (isReturned && !isAdmin) {
      // HR users cannot edit returned assignments (view-only)
      // Admin users can edit all fields even for returned assignments
      return res.status(403).json({
        detail: 'Cannot update a returned assignment. It is view-only.',
      });
    }

    // Fetch employee name if employee_id is provided
    let employee_name = null;
    if (employee_id) {
      const employeeResult = await db.query(
        'SELECT full_name FROM employees WHERE employee_id = $1',
        [employee_id]
      );
      if (employeeResult.rows.length === 0) {
        return res.status(400).json({ detail: 'Employee not found' });
      }
      employee_name = employeeResult.rows[0].full_name;
    }

    // Fetch asset name if asset_id is provided
    let asset_name = null;
    if (asset_id) {
      const assetResult = await db.query(
        'SELECT asset_name FROM assets WHERE asset_id = $1',
        [asset_id]
      );
      if (assetResult.rows.length === 0) {
        return res.status(400).json({ detail: 'Asset not found' });
      }
      asset_name = assetResult.rows[0].asset_name;
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (employee_id) {
      updateFields.push('employee_id = $' + (updateValues.length + 1));
      updateValues.push(employee_id);
    }
    if (employee_name) {
      updateFields.push('employee_name = $' + (updateValues.length + 1));
      updateValues.push(employee_name);
    }
    if (asset_id) {
      updateFields.push('asset_id = $' + (updateValues.length + 1));
      updateValues.push(asset_id);
    }
    if (asset_name) {
      updateFields.push('asset_name = $' + (updateValues.length + 1));
      updateValues.push(asset_name);
    }
    if (assigned_date !== undefined) {
      updateFields.push('assigned_date = $' + (updateValues.length + 1));
      updateValues.push(assigned_date);
    }
    if (return_date !== undefined) {
      updateFields.push('return_date = $' + (updateValues.length + 1));
      updateValues.push(return_date || null);
    }
    if (asset_return_condition !== undefined) {
      updateFields.push('asset_return_condition = $' + (updateValues.length + 1));
      updateValues.push(asset_return_condition || null);
    }
    if (remarks !== undefined) {
      updateFields.push('remarks = $' + (updateValues.length + 1));
      updateValues.push(remarks || null);
    }
    if (sim_provider !== undefined) {
      updateFields.push('sim_provider = $' + (updateValues.length + 1));
      updateValues.push(sim_provider || null);
    }
    if (sim_mobile_number !== undefined) {
      updateFields.push('sim_mobile_number = $' + (updateValues.length + 1));
      updateValues.push(sim_mobile_number || null);
    }
    if (sim_type !== undefined) {
      updateFields.push('sim_type = $' + (updateValues.length + 1));
      updateValues.push(sim_type || null);
    }
    if (sim_ownership !== undefined) {
      updateFields.push('sim_ownership = $' + (updateValues.length + 1));
      updateValues.push(sim_ownership || null);
    }
    if (sim_purpose !== undefined) {
      updateFields.push('sim_purpose = $' + (updateValues.length + 1));
      updateValues.push(sim_purpose || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ detail: 'No fields to update' });
    }

    updateValues.push(assignment_id);

    const result = await db.query(
      `UPDATE assignments SET ${updateFields.join(', ')} WHERE assignment_id = $${updateValues.length}`,
      updateValues
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'Assignment not found' });
    }

    // Update asset status and condition based on return_date and asset_return_condition
    const assetUpdateFields = [];
    const assetUpdateValues = [];

    // Check if return_date is being changed (handle DB date as object or string)
    if (return_date !== undefined) {
      const newReturnDate = (return_date === '' || return_date === null) ? null : return_date;
      const wasReturned = currentReturnDate != null && currentReturnDate !== '';
      const willBeReturned = newReturnDate != null && newReturnDate !== '';

      // Check for other active assignments (this will be used for both setting and clearing return_date)
      const otherAssignmentsResult = await db.query(
        'SELECT COUNT(*) as count FROM assignments WHERE asset_id = $1 AND assignment_id != $2 AND return_date IS NULL',
        [currentAssetId, assignment_id]
      );
      const hasOtherActiveAssignments = Number(otherAssignmentsResult.rows[0]?.count) > 0;

      // If return_date is being set or changed to a non-null value (asset is being returned or return date is being updated)
      if (willBeReturned) {
        // Only set asset to "Available" if there are no other active assignments
        // If there are other active assignments, asset should remain "Assigned"
        if (!hasOtherActiveAssignments) {
          assetUpdateFields.push('status = $' + (assetUpdateValues.length + 1));
          assetUpdateValues.push('Available');
        }
      }
      // If return_date is being cleared (changed to null) - check if asset is assigned to another user
      else if (wasReturned && !willBeReturned) {
        // If asset is already assigned to another user, prevent the return date update
        if (hasOtherActiveAssignments) {
          return res.status(400).json({
            detail: 'Cannot remove return date: This asset is already assigned to another user. Please return the asset from the current assignment first.'
          });
        }
        
        // If asset is not assigned to another user, allow the update and set asset to Assigned
        assetUpdateFields.push('status = $' + (assetUpdateValues.length + 1));
        assetUpdateValues.push('Assigned');
      }
    }

    // Update asset condition_status based on asset_return_condition
    if (asset_return_condition !== undefined) {
      if (asset_return_condition === 'Damaged' || asset_return_condition === 'Needs Repair') {
        assetUpdateFields.push('condition_status = $' + (assetUpdateValues.length + 1));
        assetUpdateValues.push('Damaged');
      } else if (asset_return_condition === 'Good') {
        assetUpdateFields.push('condition_status = $' + (assetUpdateValues.length + 1));
        assetUpdateValues.push('Good');
      }
    }

    // Update asset if there are fields to update
    if (assetUpdateFields.length > 0) {
      assetUpdateValues.push(currentAssetId);
      await db.query(
        `UPDATE assets SET ${assetUpdateFields.join(', ')} WHERE asset_id = $${assetUpdateValues.length}`,
        assetUpdateValues
      );
    }

    // Fetch updated assignment
    const updatedResult = await db.query(
      'SELECT * FROM assignments WHERE assignment_id = $1',
      [assignment_id]
    );

    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ detail: 'Failed to update assignment', error: error.message });
  }
});

// Delete assignment
router.delete('/:assignment_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const result = await db.query('DELETE FROM assignments WHERE assignment_id = $1', [assignment_id]);

    if (result.rowCount === 0) {
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
