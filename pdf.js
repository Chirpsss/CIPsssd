const express = require('express');
const router = express.Router();

// PDF 走 HTML 方案：云端生成 HTML，App端用 expo-print 渲染
// 原因：pdf-lib 的 StandardFonts 不支持中文，免费套餐无法嵌入中文字体
router.post('/', async (req, res) => {
  try {
    const { content, filename = 'document' } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const lines = content.split('\n');
    let html = `<html><head><meta charset="utf-8"><style>body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;padding:40px;line-height:1.8;font-size:14px;color:#333}h1{font-size:22px;margin-bottom:12px}h2{font-size:18px}li{margin-left:20px}p{margin:8px 0}</style></head><body>`;

    for (const line of lines) {
      const t = line.trim();
      if (!t) { html += '<br>'; continue; }
      if (t.startsWith('# ')) html += `<h1>${esc(t.substring(2))}</h1>`;
      else if (t.startsWith('## ')) html += `<h2>${esc(t.substring(3))}</h2>`;
      else if (t.startsWith('- ')) html += `<li>${esc(t.substring(2))}</li>`;
      else html += `<p>${esc(t)}</p>`;
    }
    html += '</body></html>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.html"`);
    res.send(html);
  } catch (error) {
    console.error('PDF error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
module.exports = router;
