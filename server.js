const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const AMAP_KEY = process.env.AMAP_KEY || '0fc7e137dda9667f43d6540cbb0a10e4';
const GIST_ID = '8798ad5ce5d2e2c6a4c40e7e70f877b5';
const GIST_TOKEN = process.env.GIST_TOKEN || '';

app.use(express.json({ limit: '5mb' }));

/* ---------------- Gist 备份/恢复 ---------------- */
async function gistBackup(data) {
  if (!GIST_TOKEN) return;
  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${GIST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { 'data.json': { content: JSON.stringify(data, null, 2) } } })
    });
    console.log('[gist] backup done');
  } catch (e) { console.error('[gist] backup failed', e.message); }
}
async function gistRestore() {
  if (!GIST_TOKEN) return null;
  try {
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { Authorization: `Bearer ${GIST_TOKEN}` }
    });
    const g = await r.json();
    const content = g.files?.['data.json']?.content;
    if (content) { console.log('[gist] restore success'); return JSON.parse(content); }
  } catch (e) { console.error('[gist] restore failed', e.message); }
  return null;
}

/* ---------------- 数据存储 ---------------- */
async function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (d.spots || d.foods || d.wishes || d.packing) return d;
    }
  } catch (e) { console.error('loadData error', e); }
  // 尝试从 Gist 恢复
  const restored = await gistRestore();
  if (restored) { saveData(restored); return restored; }
  return { spots: [], foods: [], wishes: [], packing: [] };
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ---------------- 天气代理（真实数据，走 open-meteo） ---------------- */
const HANGZHOU_CENTER = [30.2741, 120.1551];
const TRIP_DATES = ['2026-09-25', '2026-09-26', '2026-09-27'];
app.get('/api/weather', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${HANGZHOU_CENTER[0]}&longitude=${HANGZHOU_CENTER[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Shanghai&forecast_days=16`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('open-meteo status ' + resp.status);
    const d = await resp.json();
    const daily = d && d.daily;
    if (!daily || !Array.isArray(daily.time)) throw new Error('no daily data');
    const days = TRIP_DATES.map(ds => {
      const idx = daily.time.indexOf(ds);
      if (idx < 0) return null;
      return {
        date: ds,
        code: daily.weather_code[idx],
        tmax: Math.round(daily.temperature_2m_max[idx]),
        tmin: Math.round(daily.temperature_2m_min[idx]),
        precip: daily.precipitation_probability_max[idx] ?? 0
      };
    });
    res.json({ days });
  } catch (e) {
    res.json({ days: [null, null, null], error: e.message });
  }
});

/* ---------------- REST API ---------------- */
app.get('/api/:type', async (req, res) => {
  const { type } = req.params;
  const data = await loadData();
  if (!(type in data)) return res.status(404).json({ error: 'unknown type' });
  res.json(data[type]);
});

app.put('/api/:type', async (req, res) => {
  const { type } = req.params;
  const data = await loadData();
  if (!(type in data)) return res.status(404).json({ error: 'unknown type' });
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be array' });
  data[type] = req.body;
  saveData(data);
  gistBackup(data); // 异步备份，不阻塞响应
  res.json({ ok: true, count: data[type].length });
});

/* ---------------- 高德搜索代理（隐藏 Key） ---------------- */
app.get('/api/amap/search', async (req, res) => {
  const { keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords required' });
  try {
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&city=杭州&key=${AMAP_KEY}&offset=12&extensions=base&citylimit=true`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pois = (data.pois || []).map(p => {
      const [lng, lat] = (p.location || ',').split(',').map(Number);
      return { name: p.name, lat, lng, addr: (p.address || p.pname || '杭州') + (p.tel ? ' · ' + p.tel : '') };
    });
    res.json({ pois });
  } catch (e) {
    res.status(500).json({ error: 'amap error', pois: [] });
  }
});

/* ---------------- 静态前端 ---------------- */
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Koala server running on http://localhost:${PORT}`));
