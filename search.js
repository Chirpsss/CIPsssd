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
    'https://search.bus-hit.me',
    'https://searx.tuxcloud.net',
    'https://search.sapti.me',
    'https://searxng.site',
    'https://searx.work',
    'https://search.mdosch.de',
  ];
  for (const instance of instances) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const params = new URLSearchParams({ q: query, format: 'json', language: 'zh', categories: 'general' });
      const resp = await fetch(`${instance}/search?${params}`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(t);
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
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const params = new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1' });
    const resp = await fetch(`https://api.duckduckgo.com/?${params}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
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

// DuckDuckGo HTML 搜索（兜底 — 解析HTML搜索结果）
async function ddgHtmlSearch(query) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const html = await resp.text();
    // 简易HTML解析：提取链接和摘要
    const results = [];
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const links = [];
    while ((m = linkRegex.exec(html)) !== null) {
      links.push({ url: m[1], title: m[2].replace(/<[^>]*>/g, '').trim() });
    }
    const snippets = [];
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
    for (let i = 0; i < Math.min(links.length, snippets.length, 8); i++) {
      results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] });
    }
    return results.length > 0 
      ? { results, source: 'duckduckgo', success: true }
      : null;
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

    // 尝试 DuckDuckGo API
    const ddgResult = await ddgSearch(query);
    if (ddgResult?.success) return res.json(ddgResult);

    // 尝试 DuckDuckGo HTML 抓取
    const htmlResult = await ddgHtmlSearch(query);
    if (htmlResult?.success) return res.json(htmlResult);

    // 全部失败
    return res.json({ results: [], source: 'none', success: false });
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
