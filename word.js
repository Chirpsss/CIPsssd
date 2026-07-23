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

    // ✅ v6.3: 加固 — 验证 buffer 非空再返回
    let buffer;
    try {
      buffer = await Packer.toBuffer(doc);
    } catch (packErr) {
      console.error('Word Packer.toBuffer error:', packErr.message);
      return res.status(500).json({ error: `文档生成失败: ${packErr.message}` });
    }

    if (!buffer || buffer.length === 0) {
      console.error('Word: Packer.toBuffer returned empty buffer');
      return res.status(500).json({ error: '文档生成失败：文件为空' });
    }

    console.log(`Word generated: ${buffer.length} bytes → ${filename}.docx`);
    const base64 = buffer.toString('base64');
    res.setHeader('Content-Type', 'text/plain');
    res.send(base64);
  } catch (error) {
    console.error('Word error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
