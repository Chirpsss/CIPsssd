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

    // ✅ v6.3: 加固 — 验证 buffer 非空
    let buffer;
    try {
      buffer = await workbook.xlsx.writeBuffer();
    } catch (writeErr) {
      console.error('Excel writeBuffer error:', writeErr.message);
      return res.status(500).json({ error: `表格生成失败: ${writeErr.message}` });
    }

    if (!buffer || buffer.length === 0) {
      console.error('Excel: writeBuffer returned empty buffer');
      return res.status(500).json({ error: '表格生成失败：文件为空' });
    }

    console.log(`Excel generated: ${buffer.length} bytes → ${filename}.xlsx`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Excel error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
