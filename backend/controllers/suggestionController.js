const ClothingItem = require('../models/ClothingItem');
const { getWeather, seasonFromWeather } = require('../utils/weather');

const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

// Sort candidates by "least recently worn" preference, with a little randomness
// so suggestions don't feel robotic every single day.
const rankByFreshness = (items) => {
  return [...items].sort((a, b) => {
    const aTime = a.lastWornAt ? new Date(a.lastWornAt).getTime() : 0;
    const bTime = b.lastWornAt ? new Date(b.lastWornAt).getTime() : 0;
    return aTime - bTime;
  });
};

// GET /api/suggestion/today?lat=&lon=&occasion=
exports.today = async (req, res) => {
  try {
    const { lat, lon, occasion } = req.query;
    const weather = await getWeather(lat, lon);
    const targetSeason = seasonFromWeather(weather);

    const baseFilter = { user: req.user._id, inLaundry: false };
    if (occasion) baseFilter.occasions = occasion.toLowerCase();

    const seasonOr = [{ season: targetSeason }, { season: 'all' }];

    const [tops, bottoms, shoes, outerwear] = await Promise.all([
      ClothingItem.find({ ...baseFilter, category: 'top', $or: seasonOr }),
      ClothingItem.find({ ...baseFilter, category: 'bottom', $or: seasonOr }),
      ClothingItem.find({ ...baseFilter, category: 'shoes', $or: seasonOr }),
      ClothingItem.find({ ...baseFilter, category: 'outerwear', $or: seasonOr }),
    ]);

    const rankedTops = rankByFreshness(tops);
    const rankedBottoms = rankByFreshness(bottoms);
    const rankedShoes = rankByFreshness(shoes);

    const suggestion = {
      top: rankedTops[0] || pick(tops) || null,
      bottom: rankedBottoms[0] || pick(bottoms) || null,
      shoes: rankedShoes[0] || pick(shoes) || null,
      outerwear: (weather.tempC <= 20 || weather.isRainy) ? (outerwear[0] || null) : null,
    };

    const missing = Object.entries(suggestion)
      .filter(([k, v]) => k !== 'outerwear' && !v)
      .map(([k]) => k);

    res.json({ weather, targetSeason, suggestion, missing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/suggestion/packing  { startDate, endDate, occasion, lat, lon }
exports.packing = async (req, res) => {
  try {
    const { startDate, endDate, occasion, lat, lon } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }
    const days = Math.max(
      1,
      Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
    );

    const weather = await getWeather(lat, lon);
    const targetSeason = seasonFromWeather(weather);

    const baseFilter = { user: req.user._id, inLaundry: false, $or: [{ season: targetSeason }, { season: 'all' }] };
    if (occasion) baseFilter.occasions = occasion.toLowerCase();

    const [tops, bottoms, shoes, outerwear, accessories] = await Promise.all([
      ClothingItem.find({ ...baseFilter, category: 'top' }),
      ClothingItem.find({ ...baseFilter, category: 'bottom' }),
      ClothingItem.find({ ...baseFilter, category: 'shoes' }),
      ClothingItem.find({ ...baseFilter, category: 'outerwear' }),
      ClothingItem.find({ ...baseFilter, category: 'accessory' }),
    ]);

    // Simple packing heuristic: ~1 top per day (max stock available), bottoms reused ~2 days,
    // 1-2 pairs of shoes, outerwear only if cold/rainy.
    const topsCount = Math.min(tops.length, days);
    const bottomsCount = Math.min(bottoms.length, Math.max(1, Math.ceil(days / 2)));
    const shoesCount = Math.min(shoes.length, days > 4 ? 2 : 1);

    const packingList = {
      tops: rankByFreshness(tops).slice(0, topsCount),
      bottoms: rankByFreshness(bottoms).slice(0, bottomsCount),
      shoes: rankByFreshness(shoes).slice(0, shoesCount),
      outerwear: (weather.tempC <= 20 || weather.isRainy) ? rankByFreshness(outerwear).slice(0, 1) : [],
      accessories: rankByFreshness(accessories).slice(0, 3),
    };

    res.json({ days, weather, targetSeason, packingList });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- "Complete the Look" -----------------------------------------------

const NEUTRALS = ['black', 'white', 'grey', 'gray', 'beige', 'navy', 'brown', 'cream', 'tan', 'charcoal', 'denim'];

// Small hand-built complementary-color table — not a real color-theory engine,
// just enough to bias suggestions toward combos that usually look good.
const COMPLEMENTARY_PAIRS = {
  blue: ['orange', 'brown', 'tan', 'beige', 'white'],
  red: ['black', 'grey', 'navy', 'white'],
  green: ['beige', 'brown', 'white', 'cream'],
  yellow: ['navy', 'blue', 'grey'],
  pink: ['grey', 'navy', 'blue', 'white'],
  orange: ['blue', 'navy', 'white'],
  purple: ['grey', 'beige', 'white'],
  maroon: ['beige', 'grey', 'white'],
};

function colorScore(a, b) {
  if (!a || !b) return 1; // unknown colors: neutral score, don't penalize
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return 1;
  if (NEUTRALS.some((n) => x.includes(n)) || NEUTRALS.some((n) => y.includes(n))) return 2;
  for (const [key, partners] of Object.entries(COMPLEMENTARY_PAIRS)) {
    if (x.includes(key) && partners.some((p) => y.includes(p))) return 2;
    if (y.includes(key) && partners.some((p) => x.includes(p))) return 2;
  }
  return 0;
}

// Which categories "complete" an item of a given category.
const COMPLEMENT_CATEGORIES = {
  top: ['bottom', 'shoes', 'outerwear', 'accessory'],
  bottom: ['top', 'shoes', 'accessory'],
  dress: ['shoes', 'accessory', 'outerwear', 'bag'],
  outerwear: ['top', 'bottom', 'shoes'],
  shoes: ['top', 'bottom'],
  accessory: ['top', 'bottom'],
  bag: ['top', 'bottom', 'dress'],
};

// GET /api/suggestion/complete-look/:itemId
// Returns up to 3 suggestions per complementary category, ranked by color
// harmony + shared occasion tags + how long it's been since the item was worn.
exports.completeLook = async (req, res) => {
  try {
    const source = await ClothingItem.findOne({ _id: req.params.itemId, user: req.user._id });
    if (!source) return res.status(404).json({ message: 'Item not found' });

    const targetCategories = COMPLEMENT_CATEGORIES[source.category] || [];
    const results = {};

    for (const cat of targetCategories) {
      const candidates = await ClothingItem.find({
        user: req.user._id,
        category: cat,
        inLaundry: false,
        _id: { $ne: source._id },
      });

      const scored = candidates
        .map((c) => {
          let score = colorScore(source.color, c.color);
          const sharedOccasions = (source.occasions || []).filter((o) => (c.occasions || []).includes(o));
          score += sharedOccasions.length * 2;
          if (source.season === c.season || c.season === 'all' || source.season === 'all') score += 1;
          if (!c.wearCount) score += 0.5; // give under-worn pieces a small nudge
          return { item: c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s) => s.item);

      if (scored.length) results[cat] = scored;
    }

    res.json({ item: source, suggestions: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
