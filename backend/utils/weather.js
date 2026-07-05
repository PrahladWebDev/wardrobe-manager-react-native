const fetch = require('node-fetch');

// Returns { tempC, condition, isRainy } — falls back to a sane mock if no API key is set,
// so the app keeps working out of the box during development.
async function getWeather(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || !lat || !lon) {
    return mockWeather();
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) return mockWeather();
    const data = await resp.json();
    const tempC = data.main?.temp ?? 25;
    const main = (data.weather?.[0]?.main || '').toLowerCase();
    const isRainy = main.includes('rain') || main.includes('thunderstorm') || main.includes('drizzle');
    return { tempC, condition: data.weather?.[0]?.main || 'Clear', isRainy };
  } catch (err) {
    return mockWeather();
  }
}

function mockWeather() {
  // Reasonable default for a demo without an API key: mild day
  return { tempC: 26, condition: 'Clear', isRainy: false, mocked: true };
}

function seasonFromWeather({ tempC, isRainy }) {
  if (isRainy) return 'monsoon';
  if (tempC <= 18) return 'winter';
  if (tempC >= 28) return 'summer';
  return 'all';
}

module.exports = { getWeather, seasonFromWeather };
