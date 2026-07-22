const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { data, headers, filename = 'spreadsheet' } = req.body;
    if (!data && !headers) return res.status(400).json({ error: 'data or headers required' });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgentFile';
    const ws = workbook.addWorksheet('Sheet1');

    if (headers && headers.length > 0) {
      ws.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      for (let c = 1; c <= headers.length; c++) {
        headerRow.getCell(c).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }

    if (data && data.length > 0) {
      for (const row of data) {
        ws.addRow(Array.isArray(row) ? row : [row]);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Excel error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
