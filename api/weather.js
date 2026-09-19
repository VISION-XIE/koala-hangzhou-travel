const HANGZHOU_CENTER = [30.2741, 120.1551];
const TRIP_DATES = ['2026-09-25', '2026-09-26', '2026-09-27'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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

    res.status(200).json({ days });
  } catch (e) {
    res.status(200).json({ days: [null, null, null], error: e.message });
  }
};