const GIST_ID = '8798ad5ce5d2e2c6a4c40e7e70f877b5';
const GIST_TOKEN = process.env.GIST_TOKEN || '';

async function loadGist() {
  const headers = GIST_TOKEN ? { Authorization: `Bearer ${GIST_TOKEN}` } : {};
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
  const g = await r.json();
  const content = g.files?.['data.json']?.content;
  return content ? JSON.parse(content) : { spots: [], foods: [], wishes: [], packing: [] };
}

async function saveGist(data) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${GIST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { 'data.json': { content: JSON.stringify(data, null, 2) } } })
  });
}

module.exports = async (req, res) => {
  const type = req.query.type;
  const valid = ['spots', 'foods', 'wishes', 'packing'];
  if (!valid.includes(type)) return res.status(404).json({ error: 'unknown type' });

  if (req.method === 'GET') {
    const data = await loadGist();
    return res.status(200).json(data[type] || []);
  }

  if (req.method === 'PUT') {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be array' });
    const data = await loadGist();
    data[type] = req.body;
    await saveGist(data);
    return res.status(200).json({ ok: true, count: data[type].length });
  }

  return res.status(405).json({ error: 'method not allowed' });
};
