const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get all SIM connections
router.get('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { rows: sims } = await db.query(
      'SELECT * FROM sim_connections ORDER BY id DESC'
    );
    res.json(sims);
  } catch (error) {
    console.error('Get SIM connections error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ 
      detail: 'Failed to fetch SIM connections',
      error: error.message
    });
  }
});

// Create SIM connection
router.post('/', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { sim_mobile_number, current_owner_name, connection_status, sim_status, remarks } = req.body;

    // Check if SIM already exists
    const existing = await db.query(
      'SELECT * FROM sim_connections WHERE sim_mobile_number = $1',
      [sim_mobile_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'SIM Mobile Number already exists' });
    }

    await db.query(
      'INSERT INTO sim_connections (sim_mobile_number, current_owner_name, connection_status, sim_status, remarks) VALUES ($1, $2, $3, $4, $5)',
      [sim_mobile_number, current_owner_name, connection_status || 'Active', sim_status || 'In Stock', remarks || null]
    );

    res.status(201).json({
      sim_mobile_number,
      current_owner_name,
      connection_status: connection_status || 'Active',
      sim_status: sim_status || 'In Stock',
      remarks: remarks || null
    });
  } catch (error) {
    console.error('Create SIM connection error:', error);
    res.status(500).json({ detail: 'Failed to create SIM connection' });
  }
});

// Update SIM connection
router.put('/:sim_mobile_number', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { sim_mobile_number } = req.params;
    const { current_owner_name, connection_status, sim_status, remarks } = req.body;

    const result = await db.query(
      'UPDATE sim_connections SET current_owner_name = $1, connection_status = $2, sim_status = $3, remarks = $4 WHERE sim_mobile_number = $5',
      [current_owner_name, connection_status, sim_status, remarks || null, sim_mobile_number]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'SIM connection not found' });
    }

    res.json({
      sim_mobile_number,
      current_owner_name,
      connection_status,
      sim_status,
      remarks: remarks || null
    });
  } catch (error) {
    console.error('Update SIM connection error:', error);
    res.status(500).json({ detail: 'Failed to update SIM connection' });
  }
});

// Delete SIM connection
router.delete('/:sim_mobile_number', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { sim_mobile_number } = req.params;
    const result = await db.query('DELETE FROM sim_connections WHERE sim_mobile_number = $1', [sim_mobile_number]);

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: 'SIM connection not found' });
    }

    res.json({ message: 'SIM connection deleted successfully' });
  } catch (error) {
    console.error('Delete SIM connection error:', error);
    res.status(500).json({ detail: 'Failed to delete SIM connection' });
  }
});

// Export SIM connections
router.get('/export', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const { rows: sims } = await db.query('SELECT * FROM sim_connections');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SIM Connections');

    worksheet.columns = [
      { header: 'CONNECTION', key: 'sim_mobile_number', width: 20 },
      { header: 'Current owner', key: 'current_owner_name', width: 30 },
      { header: 'Active/Inactive', key: 'connection_status', width: 15 },
      { header: 'Assigned/InStock', key: 'sim_status', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 40 }
    ];

    sims.forEach(sim => worksheet.addRow(sim));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sim_connections.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export SIM connections error:', error);
    res.status(500).json({ detail: 'Failed to export SIM connections' });
  }
});

// Download template
router.get('/template', auth, requireRole(['HR', 'Admin']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SIM Connections Template');

    worksheet.columns = [
      { header: 'CONNECTION', key: 'sim_mobile_number', width: 20 },
      { header: 'Current owner', key: 'current_owner_name', width: 30 },
      { header: 'Active/Inactive', key: 'connection_status', width: 15 },
      { header: 'Assigned/InStock', key: 'sim_status', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 40 }
    ];

    worksheet.addRow({
      sim_mobile_number: '9876543210',
      current_owner_name: 'John Doe',
      connection_status: 'Active',
      sim_status: 'Assigned',
      remarks: 'Official number for sales team'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sim_connections_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ detail: 'Failed to download template' });
  }
});

// Import SIM connections
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
        const simMobileNumber = row.getCell(1).value;
        const currentOwnerName = row.getCell(2).value;
        const connectionStatus = row.getCell(3).value || 'Active';
        const simStatus = row.getCell(4).value || 'In Stock';
        const remarks = row.getCell(5).value || null;

        if (!simMobileNumber) {
          errors.push(`Row ${i}: SIM Mobile Number is required`);
          continue;
        }

        // Check if exists
        const existing = await db.query(
          'SELECT * FROM sim_connections WHERE sim_mobile_number = $1',
          [simMobileNumber]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await db.query(
            'UPDATE sim_connections SET current_owner_name = $1, connection_status = $2, sim_status = $3, remarks = $4 WHERE sim_mobile_number = $5',
            [currentOwnerName, connectionStatus, simStatus, remarks, simMobileNumber]
          );
        } else {
          // Insert new
          await db.query(
            'INSERT INTO sim_connections (sim_mobile_number, current_owner_name, connection_status, sim_status, remarks) VALUES ($1, $2, $3, $4, $5)',
            [simMobileNumber, currentOwnerName, connectionStatus, simStatus, remarks]
          );
        }
        imported++;
      } catch (error) {
        errors.push(`Row ${i}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully imported ${imported} SIM connections`,
      imported,
      errors
    });
  } catch (error) {
    console.error('Import SIM connections error:', error);
    res.status(500).json({ detail: 'Failed to import SIM connections' });
  }
});

module.exports = router;