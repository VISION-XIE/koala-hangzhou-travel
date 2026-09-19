const AMAP_KEY = process.env.AMAP_KEY || '0fc7e137dda9667f43d6540cbb0a10e4';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
    res.status(200).json({ pois });
  } catch (e) {
    res.status(500).json({ error: 'amap error', pois: [] });
  }
};
