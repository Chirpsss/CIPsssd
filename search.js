const express = require('express');
const router = express.Router();

// 搜索结果格式
function formatResults(items) {
  return items.map(r => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content || r.snippet || '',
  }));
}

// SearXNG 搜索
async function searxngSearch(query) {
  const instances = [
    'https://searx.be',
    'https://search.sapti.me',
    'https://searx.work',
    'https://searxng.site',
  ];
  for (const instance of instances) {
    try {
      const params = new URLSearchParams({ q: query, format: 'json', language: 'zh', categories: 'general' });
      const resp = await fetch(`${instance}/search?${params}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data.results?.length > 0) {
        return { results: formatResults(data.results).slice(0, 8), source: 'searxng', success: true };
      }
    } catch { continue; }
  }
  return null;
}

// DuckDuckGo Instant Answer
async function ddgSearch(query) {
  try {
    const params = new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1' });
    const resp = await fetch(`https://api.duckduckgo.com/?${params}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const summary = (data.AbstractText || data.Abstract || '').trim();
    const results = [];
    if (Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics) {
        if (t.Text) results.push({ title: t.Text.substring(0, 100), url: t.FirstURL || '', snippet: t.Text });
      }
    }
    if (data.AbstractURL && summary) {
      results.unshift({ title: summary.substring(0, 100), url: data.AbstractURL, snippet: summary });
    }
    return { results: results.slice(0, 8), summary, source: 'duckduckgo', success: results.length > 0 };
  } catch { return null; }
}

// POST /search  — App端通过云端代理执行搜索
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });

    // 尝试 SearXNG
    const searxResult = await searxngSearch(query);
    if (searxResult) return res.json(searxResult);

    // 尝试 DuckDuckGo
    const ddgResult = await ddgSearch(query);
    if (ddgResult) return res.json(ddgResult);

    // 全部失败
    return res.json({ results: [], source: 'none', success: false });
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
