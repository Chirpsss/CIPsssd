const express = require('express');
const PptxGenJS = require('pptxgenjs');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { slides, filename = 'presentation' } = req.body;
    if (!slides || slides.length === 0) return res.status(400).json({ error: 'slides required' });

    const pptx = new PptxGenJS();
    pptx.author = 'AgentFile';
    pptx.layout = 'LAYOUT_WIDE';

    for (let i = 0; i < slides.length; i++) {
      const sl = slides[i];
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      if (sl.title) {
        slide.addText(sl.title, {
          x: 0.8, y: i === 0 ? 2.0 : 0.5, w: '80%',
          h: i === 0 ? 1.8 : 0.9,
          fontSize: i === 0 ? 40 : 28, bold: true,
          color: '1A1A2E', align: i === 0 ? 'center' : 'left',
          fontFace: 'Microsoft YaHei',
        });
      }

      if (sl.content && sl.content.length > 0) {
        slide.addText(sl.content.map(b => `• ${b}`).join('\n'), {
          x: 1.2, y: i === 0 ? 4.0 : 1.8, w: '75%',
          h: 4.5, fontSize: 18, color: '333333',
          lineSpacing: 32, fontFace: 'Microsoft YaHei', valign: 'top',
        });
      }
    }

    // ✅ v6.3: 加固 — 验证 base64 非空
    let base64;
    try {
      base64 = await pptx.write({ outputType: 'base64' });
    } catch (writeErr) {
      console.error('PPT write error:', writeErr.message);
      return res.status(500).json({ error: `演示文稿生成失败: ${writeErr.message}` });
    }

    if (!base64 || base64.length < 100) {
      console.error('PPT: write returned empty/invalid base64');
      return res.status(500).json({ error: '演示文稿生成失败：文件为空' });
    }

    console.log(`PPT generated: base64 ${base64.length} chars → ${filename}.pptx`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(base64);
  } catch (error) {
    console.error('PPT error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
