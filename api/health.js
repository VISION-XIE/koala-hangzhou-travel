module.exports = (req, res) => {
  const token = process.env.GIST_TOKEN || '';
  res.status(200).json({
    status: 'ok',
    gist_token: token ? `${token.length} chars, starts "${token.substring(0, 7)}"` : 'missing',
    amap_key: process.env.AMAP_KEY ? 'set' : 'missing',
    time: new Date().toISOString()
  });
};
