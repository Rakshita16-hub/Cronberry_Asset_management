const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const { formatDisplayDate } = require('../utils/dateFormat');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get all employees (HR/Admin only)
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { department, includeTotal } = req.query;
    
    let query = 'SELECT employee_id, full_name, department, designation, email, date_of_joining, status FROM employees';
    let countQuery = 'SELECT COUNT(*) as total FROM employees';
    const params = [];
    
    // Filter by department if provided and not empty or "all"
    if (department && department !== '' && department !== 'all' && department !== 'All') {
      query += ' WHERE department = ?';
      countQuery += ' WHERE department = ?';
      params.push(department);
    }
    
    query += ' ORDER BY id DESC';
    
    const [employees] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;
    
    // Include total count in response header for easy access
    res.setHeader('X-Total-Count', total);
    
    // If includeTotal is true, return object with employees and total
    // Otherwise return just the array for backward compatibility
    if (includeTotal === 'true') {
      res.json({
        employees,
        total
      });
    } else {
      res.json(employees);
    }
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ detail: 'Failed to fetch employees' });
  }
});

// Get unique departments
router.get('/departments', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const [departments] = await db.query(
      'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != "" ORDER BY department ASC'
    );
    res.json(departments.map(d => d.department));
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ detail: 'Failed to fetch departments' });
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

    // Check if email already exists
    const [existingEmail] = await db.query('SELECT email FROM employees WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ detail: 'Employee with this email already exists' });
    }

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

    // Check if email already exists for another employee
    const [existingEmail] = await db.query(
      'SELECT email FROM employees WHERE email = ? AND employee_id != ?',
      [email, employee_id]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ detail: 'Employee with this email already exists' });
    }

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
      worksheet.addRow({ ...emp, date_of_joining: formatDisplayDate(emp.date_of_joining) });
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

    // Process rows - start from row 2 (skip header row)
    // Use actualRowCount to avoid processing empty rows at the end
    const actualRowCount = worksheet.actualRowCount || worksheet.rowCount;

    let imported = 0;
    const errors = [];
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get initial count for employee_id generation
      const [initialCountResult] = await connection.query('SELECT COUNT(*) as count FROM employees');
      let employeeCounter = initialCountResult[0].count;
      
      for (let i = 2; i <= actualRowCount; i++) {
        const row = worksheet.getRow(i);
        
        // Skip if row doesn't exist or has no values
        if (!row || !row.hasValues) {
          continue;
        }
        
        try {
          // Helper function to safely extract cell value
          const getCellValue = (cellIndex) => {
            const cell = row.getCell(cellIndex);
            if (!cell || cell.value === null || cell.value === undefined) {
              return null;
            }
            const value = String(cell.value).trim();
            return value === '' ? null : value;
          };

          // Extract and validate cell values
          const fullName = getCellValue(1);
          const department = getCellValue(2);
          const designation = getCellValue(3);
          const email = getCellValue(4);
          const dateOfJoiningRaw = row.getCell(5)?.value;
          const dateOfJoining = (dateOfJoiningRaw !== null && dateOfJoiningRaw !== undefined) ? dateOfJoiningRaw : null;
          const statusRaw = getCellValue(6);

          // Skip empty rows (if first cell is empty, assume entire row is empty)
          if (!fullName && !department && !designation && !email && !dateOfJoining) {
            continue;
          }

          // Validate required fields
          if (!fullName) {
            errors.push(`Row ${i}: Full Name is required`);
            continue;
          }

          if (!department) {
            errors.push(`Row ${i}: Department is required`);
            continue;
          }

          if (!designation) {
            errors.push(`Row ${i}: Designation is required`);
            continue;
          }

          if (!email) {
            errors.push(`Row ${i}: Email is required`);
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${i}: Invalid email format "${email}"`);
            continue;
          }

          if (!dateOfJoining) {
            errors.push(`Row ${i}: Date of Joining is required`);
            continue;
          }

          // Format date - handle Excel date serial numbers or string dates
          let formattedDate;
          try {
            if (dateOfJoining instanceof Date) {
              formattedDate = dateOfJoining.toISOString().split('T')[0];
            } else if (typeof dateOfJoining === 'number') {
              // Excel date serial number
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + dateOfJoining * 86400000);
              formattedDate = date.toISOString().split('T')[0];
            } else {
              // String date - try to parse it
              const dateStr = String(dateOfJoining).trim();
              // Handle common date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
              let parsedDate;
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format
                parsedDate = new Date(dateStr);
              } else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                // DD/MM/YYYY or MM/DD/YYYY format
                const parts = dateStr.split('/');
                // Try DD/MM/YYYY first
                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (isNaN(parsedDate.getTime())) {
                  // Try MM/DD/YYYY
                  parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                }
              } else {
                parsedDate = new Date(dateStr);
              }
              
              if (isNaN(parsedDate.getTime())) {
                errors.push(`Row ${i}: Invalid date format "${dateStr}". Please use YYYY-MM-DD format (e.g., 2024-01-15)`);
                continue;
              }
              formattedDate = parsedDate.toISOString().split('T')[0];
            }
            
            // Validate the formatted date is reasonable (not too far in past/future)
            const dateObj = new Date(formattedDate);
            const currentYear = new Date().getFullYear();
            const dateYear = dateObj.getFullYear();
            
            if (dateYear < 1900 || dateYear > currentYear + 10) {
              errors.push(`Row ${i}: Date "${formattedDate}" is out of valid range (1900-${currentYear + 10})`);
              continue;
            }
          } catch (dateError) {
            const dateStr = dateOfJoining ? String(dateOfJoining) : 'empty';
            errors.push(`Row ${i}: Invalid date format "${dateStr}". Please use YYYY-MM-DD format (e.g., 2024-01-15). Error: ${dateError.message}`);
            continue;
          }

          // Validate status (case-insensitive)
          let status = 'Active';
          if (statusRaw) {
            const statusLower = statusRaw.toLowerCase();
            if (statusLower === 'active' || statusLower === 'exit') {
              status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
            } else {
              errors.push(`Row ${i}: Status must be "Active" or "Exit", got "${statusRaw}"`);
              continue;
            }
          }

          // Check if email already exists
          const [existingEmail] = await connection.query('SELECT email FROM employees WHERE email = ?', [email]);
          if (existingEmail.length > 0) {
            errors.push(`Row ${i}: Employee with email "${email}" already exists`);
            continue;
          }

          // Generate employee_id
          employeeCounter++;
          const employee_id = `EMP${String(employeeCounter).padStart(4, '0')}`;

          await connection.query(
            'INSERT INTO employees (employee_id, full_name, department, designation, email, date_of_joining, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              employee_id,
              fullName,
              department,
              designation,
              email,
              formattedDate,
              status
            ]
          );
          imported++;
        } catch (error) {
          // Provide more detailed error messages
          let errorMessage = error.message;
          
          // Handle specific database errors
          if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage && error.sqlMessage.includes('email')) {
              errorMessage = `Employee with email "${email}" already exists`;
            } else if (error.sqlMessage && error.sqlMessage.includes('employee_id')) {
              errorMessage = `Employee ID "${employee_id}" already exists`;
            } else {
              errorMessage = 'Duplicate entry found';
            }
          } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Database field error - please check server configuration';
          } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            errorMessage = `Invalid value format for one of the fields`;
          }
          
          errors.push(`Row ${i}: ${errorMessage}`);
          console.error(`Import error at row ${i}:`, error);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const responseMessage = errors.length > 0
      ? `Imported ${imported} employees successfully. ${errors.length} row(s) had errors.`
      : `Successfully imported ${imported} employees`;

    res.json({
      message: responseMessage,
      imported,
      totalRows: actualRowCount - 1, // Subtract header row
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import employees error:', error);
    res.status(500).json({ detail: `Failed to import employees: ${error.message}` });
  }
});

module.exports = router;