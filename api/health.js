module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    gist_token: process.env.GIST_TOKEN ? 'set' : 'missing',
    amap_key: process.env.AMAP_KEY ? 'set' : 'missing',
    time: new Date().toISOString()
  });
};
