const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get all employees (HR/Admin only)
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const [employees] = await db.query(
      'SELECT employee_id, full_name, department, designation, email, date_of_joining, status FROM employees ORDER BY id DESC'
    );
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ detail: 'Failed to fetch employees' });
  }
});

// Get employee profile (Employee role)
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employee' || !req.user.employee_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const [employees] = await db.query(
      'SELECT employee_id, full_name, department, designation, email, date_of_joining, status FROM employees WHERE employee_id = ?',
      [req.user.employee_id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ detail: 'Employee profile not found' });
    }

    res.json(employees[0]);
  } catch (error) {
    console.error('Get employee profile error:', error);
    res.status(500).json({ detail: 'Failed to fetch profile' });
  }
});

// Create employee
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { full_name, department, designation, email, date_of_joining, status } = req.body;

    // Generate employee_id
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM employees');
    const employee_id = `EMP${String(countResult[0].count + 1).padStart(4, '0')}`;

    await db.query(
      'INSERT INTO employees (employee_id, full_name, department, designation, email, date_of_joining, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [employee_id, full_name, department, designation, email, date_of_joining, status || 'Active']
    );

    res.status(201).json({
      employee_id,
      full_name,
      department,
      designation,
      email,
      date_of_joining,
      status: status || 'Active'
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ detail: 'Failed to create employee' });
  }
});

// Update employee
router.put('/:employee_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { full_name, department, designation, email, date_of_joining, status } = req.body;

    const [result] = await db.query(
      'UPDATE employees SET full_name = ?, department = ?, designation = ?, email = ?, date_of_joining = ?, status = ? WHERE employee_id = ?',
      [full_name, department, designation, email, date_of_joining, status, employee_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Employee not found' });
    }

    res.json({
      employee_id,
      full_name,
      department,
      designation,
      email,
      date_of_joining,
      status
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ detail: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/:employee_id', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { employee_id } = req.params;

    const [result] = await db.query('DELETE FROM employees WHERE employee_id = ?', [employee_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ detail: 'Failed to delete employee' });
  }
});

// Export employees to Excel
router.get('/export', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const [employees] = await db.query('SELECT * FROM employees');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date of Joining', key: 'date_of_joining', width: 15 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    employees.forEach(emp => {
      worksheet.addRow(emp);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export employees error:', error);
    res.status(500).json({ detail: 'Failed to export employees' });
  }
});

// Download template
router.get('/template', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees Template');

    worksheet.columns = [
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date of Joining', key: 'date_of_joining', width: 15 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    worksheet.addRow({
      full_name: 'John Smith',
      department: 'IT',
      designation: 'Software Engineer',
      email: 'john.smith@example.com',
      date_of_joining: '2024-01-15',
      status: 'Active'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ detail: 'Failed to download template' });
  }
});

// Import employees from Excel
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

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      
      try {
        const [countResult] = await db.query('SELECT COUNT(*) as count FROM employees');
        const employee_id = `EMP${String(countResult[0].count + 1).padStart(4, '0')}`;

        await db.query(
          'INSERT INTO employees (employee_id, full_name, department, designation, email, date_of_joining, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            employee_id,
            row.getCell(1).value,
            row.getCell(2).value,
            row.getCell(3).value,
            row.getCell(4).value,
            row.getCell(5).value,
            row.getCell(6).value || 'Active'
          ]
        );
        imported++;
      } catch (error) {
        errors.push(`Row ${i}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully imported ${imported} employees`,
      imported,
      errors
    });
  } catch (error) {
    console.error('Import employees error:', error);
    res.status(500).json({ detail: 'Failed to import employees' });
  }
});

module.exports = router;