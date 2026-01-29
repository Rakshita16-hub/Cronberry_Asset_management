const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get all assets
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT asset_id, asset_name, category, brand, serial_number, imei_2, condition_status AS condition, status, remarks FROM assets ORDER BY id DESC'
    );
    
    // For assets with status "Assigned", fetch assignment information
    const assetsWithAssignments = await Promise.all(
      result.rows.map(async (asset) => {
        if (asset.status === 'Assigned') {
          const assignmentResult = await db.query(
            'SELECT employee_id, employee_name, assigned_date FROM assignments WHERE asset_id = $1 AND return_date IS NULL ORDER BY assigned_date DESC LIMIT 1',
            [asset.asset_id]
          );

          if (assignmentResult.rows.length > 0) {
            const assignment = assignmentResult.rows[0];
            asset.assigned_to = assignment.employee_id;
            asset.assigned_employee_name = assignment.employee_name;
            asset.assigned_date = assignment.assigned_date;
          }
        }
        return asset;
      })
    );

    res.json(assetsWithAssignments);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ detail: 'Failed to fetch assets' });
  }
});

// Get single asset by asset_id (for editing)
router.get('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    
    // Get asset details
    const assetResult = await db.query(
      'SELECT asset_id, asset_name, category, brand, serial_number, imei_2, condition_status AS condition, status, remarks FROM assets WHERE asset_id = $1',
      [asset_id]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Asset not found' });
    }

    const asset = assetResult.rows[0];

    // If status is Assigned, get the active assignment (where return_date is NULL)
    if (asset.status === 'Assigned') {
      const assignmentResult = await db.query(
        'SELECT employee_id, employee_name, assigned_date FROM assignments WHERE asset_id = $1 AND return_date IS NULL ORDER BY assigned_date DESC LIMIT 1',
        [asset_id]
      );

      if (assignmentResult.rows.length > 0) {
        const assignment = assignmentResult.rows[0];
        asset.assigned_to = assignment.employee_id;
        asset.assigned_employee_name = assignment.employee_name;
        asset.assigned_date = assignment.assigned_date;
      }
    }

    res.json(asset);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ detail: 'Failed to fetch asset' });
  }
});

// Create asset
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  const { asset_name, category, brand, serial_number, imei_2, condition, status, assigned_to, assigned_date, remarks } = req.body;

  // Validate: If status is "Assigned", assigned_to (employee_id) is required
  if (status === 'Assigned' && !assigned_to) {
    return res.status(400).json({ detail: 'Employee ID (assigned_to) is required when status is "Assigned"' });
  }

  // Category-based validation
  const categoryLower = (category || '').toLowerCase().trim();
  
  if (categoryLower === 'laptop') {
    if (!serial_number || serial_number.trim() === '') {
      return res.status(400).json({ detail: 'Serial Number is required for Laptop category' });
    }
  } else if (categoryLower === 'mobile') {
    // For mobile category, either IMEI1 (serial_number) or IMEI2 (imei_2) is required
    if ((!serial_number || serial_number.trim() === '') && (!imei_2 || imei_2.trim() === '')) {
      return res.status(400).json({ detail: 'Either IMEI1 Number (Serial Number) or IMEI2 Number is required for Mobile category' });
    }
  } else {
    // For other categories (Other, electronic item, cable, mouse, etc.), serial_number is required
    if (!serial_number || serial_number.trim() === '') {
      return res.status(400).json({ detail: 'Serial Number is required for this category' });
    }
  }

  const client = await db.connect();
  
  try {
    // Check for duplicate serial_number (if provided)
    if (serial_number && serial_number.trim() !== '') {
      const { rows: existingSerial } = await client.query(
        'SELECT asset_id FROM assets WHERE serial_number = $1',
        [serial_number.trim()]
      );
      if (existingSerial.length > 0) {
        client.release();
        return res.status(400).json({ detail: `Serial Number "${serial_number}" already exists. Please use a unique serial number.` });
      }
    }

    // Check for duplicate imei_2 (if provided)
    if (imei_2 && imei_2.trim() !== '') {
      const { rows: existingIMEI } = await client.query(
        'SELECT asset_id FROM assets WHERE imei_2 = $1',
        [imei_2.trim()]
      );
      if (existingIMEI.length > 0) {
        client.release();
        return res.status(400).json({ detail: `IMEI Number "${imei_2}" already exists. Please use a unique IMEI number.` });
      }
    }

    // Determine the final status
    const validStatus = status || 'Available';

    // Start transaction
    await client.query('BEGIN');

    // Generate asset_id
    const { rows: countRows } = await client.query('SELECT COUNT(*) AS count FROM assets');
    const currentCount = Number(countRows[0]?.count) || 0;
    const asset_id = `AST${String(currentCount + 1).padStart(4, '0')}`;

    // Step 1: Create the asset first
    await client.query(
      'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [asset_id, asset_name, category, brand, serial_number || null, imei_2 || null, condition || 'New', validStatus, remarks || null]
    );

    let assignment = null;

    // Step 2: If status is "Assigned" and assigned_to is provided, create assignment automatically
    if (validStatus === 'Assigned' && assigned_to) {
      // Fetch employee details
      const { rows: employees } = await client.query(
        'SELECT employee_id, full_name FROM employees WHERE employee_id = $1',
        [assigned_to]
      );

      if (employees.length === 0) {
        // Rollback transaction if employee not found
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ detail: 'Employee not found. Please provide a valid Employee ID.' });
      }

      const employee = employees[0];

      // Generate assignment_id
      const { rows: assignCountRows } = await client.query('SELECT COUNT(*) AS count FROM assignments');
      const currentAssignCount = Number(assignCountRows[0]?.count) || 0;
      const assignment_id = `ASG${String(currentAssignCount + 1).padStart(4, '0')}`;

      // Use provided assigned_date or default to today
      const assignmentDate = assigned_date || new Date().toISOString().split('T')[0];

      // Create assignment
      await client.query(
        'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date) VALUES ($1, $2, $3, $4, $5, $6)',
        [assignment_id, employee.employee_id, employee.full_name, asset_id, asset_name, assignmentDate]
      );

      // Fetch the created assignment
      const { rows: createdAssignmentRows } = await client.query(
        'SELECT * FROM assignments WHERE assignment_id = $1',
        [assignment_id]
      );
      assignment = createdAssignmentRows[0];
    }

    // Commit transaction
    await client.query('COMMIT');
    client.release();

    res.status(201).json({
      asset_id,
      asset_name,
      category,
      brand,
      serial_number: serial_number || null,
      imei_2: imei_2 || null,
      condition: condition || 'New',
      status: validStatus,
      remarks: remarks || null,
      assignment: assignment || null
    });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    client.release();
    console.error('Create asset error:', error);
    res.status(500).json({ detail: 'Failed to create asset', error: error.message });
  }
});

// Update asset
router.put('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { asset_name, category, brand, serial_number, imei_2, condition, status, remarks } = req.body;

    // Category-based validation
    const categoryLower = (category || '').toLowerCase().trim();
    
    if (categoryLower === 'laptop') {
      if (!serial_number || serial_number.trim() === '') {
        return res.status(400).json({ detail: 'Serial Number is required for Laptop category' });
      }
    } else if (categoryLower === 'mobile') {
      // For mobile category, either IMEI1 (serial_number) or IMEI2 (imei_2) is required
      if ((!serial_number || serial_number.trim() === '') && (!imei_2 || imei_2.trim() === '')) {
        return res.status(400).json({ detail: 'Either IMEI1 Number (Serial Number) or IMEI2 Number is required for Mobile category' });
      }
    } else {
      // For other categories (Other, electronic item, cable, mouse, etc.), serial_number is required
      if (!serial_number || serial_number.trim() === '') {
        return res.status(400).json({ detail: 'Serial Number is required for this category' });
      }
    }

    // Check for duplicate serial_number (if provided and different from current)
    if (serial_number && serial_number.trim() !== '') {
      const { rows: existingSerial } = await db.query(
        'SELECT asset_id FROM assets WHERE serial_number = $1 AND asset_id != $2',
        [serial_number.trim(), asset_id]
      );
      if (existingSerial.length > 0) {
        return res.status(400).json({ detail: `Serial Number "${serial_number}" already exists. Please use a unique serial number.` });
      }
    }

    // Check for duplicate imei_2 (if provided and different from current)
    if (imei_2 && imei_2.trim() !== '') {
      const { rows: existingIMEI } = await db.query(
        'SELECT asset_id FROM assets WHERE imei_2 = $1 AND asset_id != $2',
        [imei_2.trim(), asset_id]
      );
      if (existingIMEI.length > 0) {
        return res.status(400).json({ detail: `IMEI Number "${imei_2}" already exists. Please use a unique IMEI number.` });
      }
    }

    const result = await db.query(
      `UPDATE assets
       SET asset_name = $1,
           category = $2,
           brand = $3,
           serial_number = $4,
           imei_2 = $5,
           condition_status = $6,
           status = $7,
           remarks = $8
       WHERE asset_id = $9`,
      [asset_name, category, brand, serial_number || null, imei_2 || null, condition, status, remarks ?? null, asset_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'Asset not found' });
    }

    // Build response object
    const response = {
      asset_id,
      asset_name,
      category,
      brand,
      serial_number: serial_number || null,
      imei_2: imei_2 || null,
      condition,
      status,
      remarks: remarks ?? null
    };

    // If status is Assigned, get the active assignment (where return_date is NULL)
    if (status === 'Assigned') {
      const assignmentResult = await db.query(
        'SELECT employee_id, employee_name, assigned_date FROM assignments WHERE asset_id = $1 AND return_date IS NULL ORDER BY assigned_date DESC LIMIT 1',
        [asset_id]
      );

      if (assignmentResult.rows.length > 0) {
        const assignment = assignmentResult.rows[0];
        response.assigned_to = assignment.employee_id;
        response.assigned_employee_name = assignment.employee_name;
        response.assigned_date = assignment.assigned_date;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ detail: 'Failed to update asset' });
  }
});

// Delete asset
router.delete('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    const result = await db.query('DELETE FROM assets WHERE asset_id = $1', [asset_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'Asset not found' });
    }

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ detail: 'Failed to delete asset' });
  }
});

// Export assets
router.get('/export', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { rows: assets } = await db.query('SELECT * FROM assets');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets');

    worksheet.columns = [
      { header: 'Asset ID', key: 'asset_id', width: 15 },
      { header: 'Asset Name', key: 'asset_name', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Serial Number / IMEI 1', key: 'serial_number', width: 25 },
      { header: 'IMEI 2', key: 'imei_2', width: 25 },
      { header: 'Condition', key: 'condition_status', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    assets.forEach(asset => worksheet.addRow(asset));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=assets.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export assets error:', error);
    res.status(500).json({ detail: 'Failed to export assets' });
  }
});

// Download template
router.get('/template', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets Template');

    worksheet.columns = [
      { header: 'Asset Name', key: 'asset_name', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Serial Number', key: 'serial_number', width: 25 },
      { header: 'IMEI 2', key: 'imei_2', width: 25 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned To (Employee Name)', key: 'employee_name', width: 30 },
      { header: 'Assigned To (Employee Email)', key: 'employee_email', width: 30 },
      { header: 'Assigned Date', key: 'assigned_date', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 40 }
    ];

    worksheet.addRow({
      asset_name: 'Dell Laptop',
      category: 'Electronics',
      brand: 'Dell',
      serial_number: 'DL123456',
      imei_2: '',
      condition: 'New',
      status: 'Available',
      employee_name: '',
      employee_email: '',
      assigned_date: '',
      remarks: ''
    });
    
    worksheet.addRow({
      asset_name: 'iPhone 15',
      category: 'Mobile',
      brand: 'Apple',
      serial_number: '356789012345678',
      imei_2: '356789012345679',
      condition: 'New',
      status: 'Assigned',
      employee_name: 'Test Employee UI',
      employee_email: 'test@example.com',
      assigned_date: '2024-01-20',
      remarks: ''
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=assets_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ detail: 'Failed to download template' });
  }
});

// Import assets with validation and auto-assignment
router.post('/import', auth, requireRole(['HR', 'Admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    let imported = 0;
    const errors = [];
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        try {
          const assetName = row.getCell(1).value;
          const category = row.getCell(2).value;
          const brand = row.getCell(3).value;
          const serialNumber = (row.getCell(4).value && String(row.getCell(4).value).trim()) || null;
          const imei2 = (row.getCell(5).value && String(row.getCell(5).value).trim()) || null;
          const condition = row.getCell(6).value || 'New';
          const status = row.getCell(7).value || 'Available';
          const employeeName = (row.getCell(8).value && String(row.getCell(8).value).trim()) || null;
          const employeeEmail = (row.getCell(9).value && String(row.getCell(9).value).trim()) || null;
          const assignedDate = row.getCell(10).value || new Date().toISOString().split('T')[0];
          const remarks = (row.getCell(11).value && String(row.getCell(11).value).trim()) || null;

          // Category-based validation
          const categoryLower = (category || '').toLowerCase().trim();
          
          if (categoryLower === 'laptop') {
            if (!serialNumber || serialNumber.trim() === '') {
              errors.push(`Row ${i}: Serial Number is required for Laptop category.`);
              continue;
            }
          } else if (categoryLower === 'mobile') {
            // For mobile category, either IMEI1 (serialNumber) or IMEI2 (imei2) is required
            if ((!serialNumber || serialNumber.trim() === '') && (!imei2 || imei2.trim() === '')) {
              errors.push(`Row ${i}: Either IMEI1 Number (Serial Number) or IMEI2 Number is required for Mobile category.`);
              continue;
            }
          } else {
            // For other categories (Other, electronic item, cable, mouse, etc.), serial_number is required
            if (!serialNumber || serialNumber.trim() === '') {
              errors.push(`Row ${i}: Serial Number is required for this category.`);
              continue;
            }
          }

          // Check for duplicate serial_number (if provided)
          if (serialNumber && serialNumber.trim() !== '') {
            const { rows: existingSerial } = await client.query(
              'SELECT asset_id FROM assets WHERE serial_number = $1',
              [serialNumber.trim()]
            );
            if (existingSerial.length > 0) {
              errors.push(`Row ${i}: Serial Number "${serialNumber}" already exists. Please use a unique serial number.`);
              continue;
            }
          }

          // Check for duplicate imei_2 (if provided)
          if (imei2 && imei2.trim() !== '') {
            const { rows: existingIMEI } = await client.query(
              'SELECT asset_id FROM assets WHERE imei_2 = $1',
              [imei2.trim()]
            );
            if (existingIMEI.length > 0) {
              errors.push(`Row ${i}: IMEI Number "${imei2}" already exists. Please use a unique IMEI number.`);
              continue;
            }
          }

          // Validation: If status is Assigned, employee name or email is required
          if (status === 'Assigned') {
            if (!employeeName && !employeeEmail) {
              errors.push(`Row ${i}: Employee Name or Email is required when Asset Status is Assigned.`);
              continue;
            }

            // Find employee by name or email (case-insensitive)
            let employees = [];
            if (employeeName && employeeEmail) {
              // Try to match both first (more accurate), then fallback to OR
              const { rows: exactMatch } = await client.query(
                'SELECT * FROM employees WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1)) AND LOWER(TRIM(email)) = LOWER(TRIM($2)) LIMIT 1',
                [employeeName, employeeEmail]
              );
              if (exactMatch.length > 0) {
                employees = exactMatch;
              } else {
                // Fallback to OR if exact match not found
                const { rows: orMatch } = await client.query(
                  'SELECT * FROM employees WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($2)) LIMIT 1',
                  [employeeName, employeeEmail]
                );
                employees = orMatch;
              }
            } else if (employeeName) {
              const { rows: nameMatch } = await client.query(
                'SELECT * FROM employees WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1)) LIMIT 1',
                [employeeName]
              );
              employees = nameMatch;
            } else if (employeeEmail) {
              const { rows: emailMatch } = await client.query(
                'SELECT * FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
                [employeeEmail]
              );
              employees = emailMatch;
            }

            if (employees.length === 0) {
              errors.push(`Row ${i}: Employee not found. Please provide a valid Employee Name or Email.`);
              continue;
            }

            const employee = employees[0];

            // Create asset
            const { rows: countRows } = await client.query('SELECT COUNT(*) AS count FROM assets');
            const currentCount = Number(countRows[0]?.count) || 0;
            const assetId = `AST${String(currentCount + 1).padStart(4, '0')}`;

            await client.query(
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status, remarks]
            );

            // Auto-create assignment
            const { rows: assignCountRows } = await client.query('SELECT COUNT(*) AS count FROM assignments');
            const currentAssignCount = Number(assignCountRows[0]?.count) || 0;
            const assignmentId = `ASG${String(currentAssignCount + 1).padStart(4, '0')}`;

            await client.query(
              'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date) VALUES ($1, $2, $3, $4, $5, $6)',
              [assignmentId, employee.employee_id, employee.full_name, assetId, assetName, assignedDate]
            );

            imported++;
          } else {
            // Regular asset import without assignment
            const { rows: countRows } = await client.query('SELECT COUNT(*) AS count FROM assets');
            const currentCount = Number(countRows[0]?.count) || 0;
            const assetId = `AST${String(currentCount + 1).padStart(4, '0')}`;

            await client.query(
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status, remarks]
            );

            imported++;
          }
        } catch (error) {
          errors.push(`Row ${i}: ${error.message}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      message: `Successfully imported ${imported} assets`,
      imported,
      errors
    });
  } catch (error) {
    console.error('Import assets error:', error);
    res.status(500).json({ detail: 'Failed to import assets' });
  }
});

module.exports = router;