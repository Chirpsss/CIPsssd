const express = require('express');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { content, filename = 'document' } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const lines = content.split('\n').filter(l => l.trim());
    const children = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        children.push(new Paragraph({ text: line.substring(2), heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({ text: line.substring(3), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({ text: `• ${line.substring(2)}`, spacing: { after: 60 }, indent: { left: 360 } }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 80 } }));
      }
    }

    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: content, size: 22 })] }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Word error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
