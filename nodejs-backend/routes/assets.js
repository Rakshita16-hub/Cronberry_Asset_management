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
      'SELECT asset_id, asset_name, category, brand, serial_number, imei_2, condition_status as `condition`, status FROM assets ORDER BY id DESC'
    );
    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ detail: 'Failed to fetch assets' });
  }
});

// Create asset
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_name, category, brand, serial_number, imei_2, condition, status } = req.body;

    const [countResult] = await db.query('SELECT COUNT(*) as count FROM assets');
    const asset_id = `AST${String(countResult[0].count + 1).padStart(4, '0')}`;

    await db.query(
      'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [asset_id, asset_name, category, brand, serial_number || null, imei_2 || null, condition || 'New', status || 'Available']
    );

    res.status(201).json({
      asset_id,
      asset_name,
      category,
      brand,
      serial_number: serial_number || null,
      imei_2: imei_2 || null,
      condition: condition || 'New',
      status: status || 'Available'
    });
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ detail: 'Failed to create asset' });
  }
});

// Update asset
router.put('/:asset_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { asset_name, category, brand, serial_number, imei_2, condition, status } = req.body;

    const [result] = await db.query(
      'UPDATE assets SET asset_name = ?, category = ?, brand = ?, serial_number = ?, imei_2 = ?, condition_status = ?, status = ? WHERE asset_id = ?',
      [asset_name, category, brand, serial_number || null, imei_2 || null, condition, status, asset_id]
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
      status
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
      { header: 'Assigned To (Employee ID)', key: 'employee_id', width: 25 },
      { header: 'Assigned To (Employee Email)', key: 'employee_email', width: 30 },
      { header: 'Assigned Date', key: 'assigned_date', width: 15 }
    ];

    worksheet.addRow({
      asset_name: 'Dell Laptop',
      category: 'Electronics',
      brand: 'Dell',
      serial_number: 'DL123456',
      imei_2: '',
      condition: 'New',
      status: 'Available',
      employee_id: '',
      employee_email: '',
      assigned_date: ''
    });
    
    worksheet.addRow({
      asset_name: 'iPhone 15',
      category: 'Mobile',
      brand: 'Apple',
      serial_number: '356789012345678',
      imei_2: '356789012345679',
      condition: 'New',
      status: 'Assigned',
      employee_id: 'EMP0001',
      employee_email: '',
      assigned_date: '2024-01-20'
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
          const employeeIdOrEmail = row.getCell(8).value || row.getCell(9).value;
          const assignedDate = row.getCell(10).value || new Date().toISOString().split('T')[0];

          // Validation: If status is Assigned, employee is required
          if (status === 'Assigned') {
            if (!employeeIdOrEmail) {
              errors.push(`Row ${i}: Employee is required when Asset Status is Assigned.`);
              continue;
            }

            // Find employee
            const [employees] = await connection.query(
              'SELECT * FROM employees WHERE employee_id = ? OR email = ? LIMIT 1',
              [employeeIdOrEmail, employeeIdOrEmail]
            );

            if (employees.length === 0) {
              errors.push(`Row ${i}: Employee not found. Please provide a valid Employee ID or Email.`);
              continue;
            }

            const employee = employees[0];

            // Create asset
            const [countResult] = await connection.query('SELECT COUNT(*) as count FROM assets');
            const assetId = `AST${String(countResult[0].count + 1).padStart(4, '0')}`;

            await connection.query(
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status]
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
              'INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, imei_2, condition_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [assetId, assetName, category, brand, serialNumber, imei2, condition, status]
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