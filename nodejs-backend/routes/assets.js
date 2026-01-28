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
    const [assets] = await db.query(
      'SELECT asset_id, asset_name, category, brand, serial_number, imei_2, condition_status as `condition`, status, remarks FROM assets ORDER BY id DESC'
    );
    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ detail: 'Failed to fetch assets' });
  }
});

// Create asset
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  const { asset_name, category, brand, serial_number, imei_2, condition, status, assigned_to, assigned_date, remarks } = req.body;

  // Validate: If status is "Assigned", assigned_to (employee_id) is required
  if (status === 'Assigned' && !assigned_to) {
    return res.status(400).json({ detail: 'Employee ID (assigned_to) is required when status is "Assigned"' });
  }

  const connection = await db.getConnection();
  
  try {
    // Determine the final status
    const validStatus = status || 'Available';

    // Start transaction
    await connection.beginTransaction();

    // Generate asset_id
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM assets');
    const asset_id = `AST${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Step 1: Create the asset first
    await connection.query(
      'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [asset_id, asset_name, category, brand, serial_number || null, imei_2 || null, condition || 'New', validStatus, remarks || null]
    );

    let assignment = null;

    // Step 2: If status is "Assigned" and assigned_to is provided, create assignment automatically
    if (validStatus === 'Assigned' && assigned_to) {
      // Fetch employee details
      const [employees] = await connection.query(
        'SELECT employee_id, full_name FROM employees WHERE employee_id = ?',
        [assigned_to]
      );

      if (employees.length === 0) {
        // Rollback transaction if employee not found
        await connection.rollback();
        connection.release();
        return res.status(400).json({ detail: 'Employee not found. Please provide a valid Employee ID.' });
      }

      const employee = employees[0];

      // Generate assignment_id
      const [assignCountResult] = await connection.query('SELECT COUNT(*) as count FROM assignments');
      const assignment_id = `ASG${String(assignCountResult[0].count + 1).padStart(4, '0')}`;

      // Use provided assigned_date or default to today
      const assignmentDate = assigned_date || new Date().toISOString().split('T')[0];

      // Create assignment
      await connection.query(
        'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date) VALUES (?, ?, ?, ?, ?, ?)',
        [assignment_id, employee.employee_id, employee.full_name, asset_id, asset_name, assignmentDate]
      );

      // Fetch the created assignment
      const [createdAssignment] = await connection.query(
        'SELECT * FROM assignments WHERE assignment_id = ?',
        [assignment_id]
      );
      assignment = createdAssignment[0];
    }

    // Commit transaction
    await connection.commit();
    connection.release();

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
    await connection.rollback();
    connection.release();
    console.error('Create asset error:', error);
    res.status(500).json({ detail: 'Failed to create asset', error: error.message });
  }
});

// Update asset
router.put('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { asset_name, category, brand, serial_number, imei_2, condition, status, remarks } = req.body;

    const [result] = await db.query(
      'UPDATE assets SET asset_name = ?, category = ?, brand = ?, serial_number = ?, imei_2 = ?, condition_status = ?, status = ?, remarks = ? WHERE asset_id = ?',
      [asset_name, category, brand, serial_number || null, imei_2 || null, condition, status, remarks ?? null, asset_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Asset not found' });
    }

    res.json({
      asset_id,
      asset_name,
      category,
      brand,
      serial_number: serial_number || null,
      imei_2: imei_2 || null,
      condition,
      status,
      remarks: remarks ?? null
    });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ detail: 'Failed to update asset' });
  }
});

// Delete asset
router.delete('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    const [result] = await db.query('DELETE FROM assets WHERE asset_id = ?', [asset_id]);

    if (result.affectedRows === 0) {
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
    const [assets] = await db.query('SELECT * FROM assets');

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
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        try {
          const assetName = row.getCell(1).value;
          const category = row.getCell(2).value;
          const brand = row.getCell(3).value;
          const serialNumber = row.getCell(4).value || null;
          const imei2 = row.getCell(5).value || null;
          const condition = row.getCell(6).value || 'New';
          const status = row.getCell(7).value || 'Available';
          const employeeName = (row.getCell(8).value && String(row.getCell(8).value).trim()) || null;
          const employeeEmail = (row.getCell(9).value && String(row.getCell(9).value).trim()) || null;
          const assignedDate = row.getCell(10).value || new Date().toISOString().split('T')[0];
          const remarks = (row.getCell(11).value && String(row.getCell(11).value).trim()) || null;

          // Validation: If status is Assigned, employee name or email is required
          if (status === 'Assigned') {
            if (!employeeName && !employeeEmail) {
              errors.push(`Row ${i}: Employee Name or Email is required when Asset Status is Assigned.`);
              continue;
            }

            // Find employee by name or email
            const [employees] = await connection.query(
              employeeName && employeeEmail
                ? 'SELECT * FROM employees WHERE full_name = ? OR email = ? LIMIT 1'
                : employeeName
                  ? 'SELECT * FROM employees WHERE full_name = ? LIMIT 1'
                  : 'SELECT * FROM employees WHERE email = ? LIMIT 1',
              employeeName && employeeEmail ? [employeeName, employeeEmail] : employeeName ? [employeeName] : [employeeEmail]
            );

            if (employees.length === 0) {
              errors.push(`Row ${i}: Employee not found. Please provide a valid Employee Name or Email.`);
              continue;
            }

            const employee = employees[0];

            // Create asset
            const [countResult] = await connection.query('SELECT COUNT(*) as count FROM assets');
            const assetId = `AST${String(countResult[0].count + 1).padStart(4, '0')}`;

            await connection.query(
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status, remarks]
            );

            // Auto-create assignment
            const [assignCountResult] = await connection.query('SELECT COUNT(*) as count FROM assignments');
            const assignmentId = `ASG${String(assignCountResult[0].count + 1).padStart(4, '0')}`;

            await connection.query(
              'INSERT INTO assignments (assignment_id, employee_id, employee_name, asset_id, asset_name, assigned_date) VALUES (?, ?, ?, ?, ?, ?)',
              [assignmentId, employee.employee_id, employee.full_name, assetId, assetName, assignedDate]
            );

            imported++;
          } else {
            // Regular asset import without assignment
            const [countResult] = await connection.query('SELECT COUNT(*) as count FROM assets');
            const assetId = `AST${String(countResult[0].count + 1).padStart(4, '0')}`;

            await connection.query(
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status, remarks]
            );

            imported++;
          }
        } catch (error) {
          errors.push(`Row ${i}: ${error.message}`);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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