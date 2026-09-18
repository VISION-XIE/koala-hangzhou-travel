const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const AMAP_KEY = process.env.AMAP_KEY || '0fc7e137dda9667f43d6540cbb0a10e4';

app.use(express.json({ limit: '5mb' }));

/* ---------------- 数据存储 ---------------- */
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('loadData error', e);
  }
  return { spots: [], foods: [], wishes: [], packing: [] };
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ---------------- REST API ---------------- */
app.get('/api/:type', (req, res) => {
  const { type } = req.params;
  const data = loadData();
  if (!(type in data)) return res.status(404).json({ error: 'unknown type' });
  res.json(data[type]);
});

app.put('/api/:type', (req, res) => {
  const { type } = req.params;
  const data = loadData();
  if (!(type in data)) return res.status(404).json({ error: 'unknown type' });
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be array' });
  data[type] = req.body;
  saveData(data);
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
