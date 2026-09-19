const GIST_ID = '8798ad5ce5d2e2c6a4c40e7e70f877b5';
const GIST_TOKEN = process.env.GIST_TOKEN || '';

async function loadGist() {
  const headers = GIST_TOKEN ? { Authorization: `Bearer ${GIST_TOKEN}` } : {};
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
  if (!r.ok) throw new Error(`Gist read failed: ${r.status}`);
  const g = await r.json();
  const content = g.files?.['data.json']?.content;
  return content ? JSON.parse(content) : { spots: [], foods: [], wishes: [], packing: [] };
}

async function saveGist(data) {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${GIST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { 'data.json': { content: JSON.stringify(data, null, 2) } } })
  });
  if (!r.ok) throw new Error(`Gist write failed: ${r.status}`);
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => {
      try { resolve(d ? JSON.parse(d) : null); }
      catch { resolve(null); }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const type = req.query.type;
  const valid = ['spots', 'foods', 'wishes', 'packing'];
  if (!valid.includes(type)) return res.status(404).json({ error: 'unknown type' });

  try {
    if (req.method === 'GET') {
      const data = await loadGist();
      return res.status(200).json(data[type] || []);
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body)) return res.status(400).json({ error: 'body must be array' });
      const data = await loadGist();
      data[type] = body;
      await saveGist(data);
      return res.status(200).json({ ok: true, count: data[type].length });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
