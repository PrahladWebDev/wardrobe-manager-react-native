const ClothingItem = require('../models/ClothingItem');
const PackingList = require('../models/PackingList');
const { getWeather, seasonFromWeather } = require('../utils/weather');

// Build an occasion filter that also matches items with no occasion tags at
// all, instead of silently excluding every untagged item. Previously
// `baseFilter.occasions = occasion.toLowerCase()` required an exact array
// match, so a closet with no occasion tags (the default) always returned
// empty results.
const occasionOr = (occasion) =>
  occasion ? [{ occasions: occasion.toLowerCase() }, { occasions: { $size: 0 } }] : null;

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

// --- Outfit Rotation ------------------------------------------------------
// Splits a category's candidates into "rested" (never worn, or not worn
// within the user's rotationDays window) vs "cooldown" (worn too recently).
// Suggestion logic should always prefer the rested pool, and only reach into
// cooldown when rested is empty — that's what keeps "Surprise Me" and Today's
// pick from repeating the same pieces two days in a row.
const splitByRotation = (items, rotationDays) => {
  if (!rotationDays) return { rested: items, cooldown: [] };
  const now = Date.now();
  const cutoffMs = rotationDays * 24 * 60 * 60 * 1000;
  const rested = [];
  const cooldown = [];
  for (const it of items) {
    const wornRecently = it.lastWornAt && now - new Date(it.lastWornAt).getTime() < cutoffMs;
    (wornRecently ? cooldown : rested).push(it);
  }
  return { rested, cooldown };
};

// Prefer the rested pool; fall back to cooldown only if rested is empty.
// Returns { pool, hadToUseCooldown } so callers can flag it to the client.
const rotationPool = (items, rotationDays) => {
  const { rested, cooldown } = splitByRotation(items, rotationDays);
  if (rested.length) return { pool: rested, hadToUseCooldown: false };
  return { pool: cooldown, hadToUseCooldown: cooldown.length > 0 };
};

// GET /api/suggestion/today?lat=&lon=&occasion=
exports.today = async (req, res) => {
  try {
    const { lat, lon, occasion } = req.query;
    const weather = await getWeather(lat, lon);
    const targetSeason = seasonFromWeather(weather);

    const seasonOr = [{ season: targetSeason }, { season: 'all' }];
    const and = [{ user: req.user._id, inLaundry: false, 'repair.status': { $nin: ['needs_repair', 'in_progress'] } }, { $or: seasonOr }];
    const occOr = occasionOr(occasion);
    if (occOr) and.push({ $or: occOr });

    const [tops, bottoms, shoes, outerwear] = await Promise.all([
      ClothingItem.find({ $and: and, category: 'top' }),
      ClothingItem.find({ $and: and, category: 'bottom' }),
      ClothingItem.find({ $and: and, category: 'shoes' }),
      ClothingItem.find({ $and: and, category: 'outerwear' }),
    ]);

    const rotationDays = req.user.rotationDays || 0;
    const topsRot = rotationPool(tops, rotationDays);
    const bottomsRot = rotationPool(bottoms, rotationDays);
    const shoesRot = rotationPool(shoes, rotationDays);

    const rankedTops = rankByFreshness(topsRot.pool);
    const rankedBottoms = rankByFreshness(bottomsRot.pool);
    const rankedShoes = rankByFreshness(shoesRot.pool);

    const suggestion = {
      top: rankedTops[0] || pick(tops) || null,
      bottom: rankedBottoms[0] || pick(bottoms) || null,
      shoes: rankedShoes[0] || pick(shoes) || null,
      outerwear: (weather.tempC <= 20 || weather.isRainy) ? (outerwear[0] || null) : null,
    };

    const missing = Object.entries(suggestion)
      .filter(([k, v]) => k !== 'outerwear' && !v)
      .map(([k]) => k);

    const rotation = {
      days: rotationDays,
      usedCooldown: [
        topsRot.hadToUseCooldown && 'top',
        bottomsRot.hadToUseCooldown && 'bottom',
        shoesRot.hadToUseCooldown && 'shoes',
      ].filter(Boolean),
    };

    res.json({ weather, targetSeason, suggestion, missing, rotation });
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

    const and = [
      { user: req.user._id, inLaundry: false, 'repair.status': { $nin: ['needs_repair', 'in_progress'] } },
      { $or: [{ season: targetSeason }, { season: 'all' }] },
    ];
    const occOr = occasionOr(occasion);
    if (occOr) and.push({ $or: occOr });

    const [tops, bottoms, shoes, outerwear, accessories] = await Promise.all([
      ClothingItem.find({ $and: and, category: 'top' }),
      ClothingItem.find({ $and: and, category: 'bottom' }),
      ClothingItem.find({ $and: and, category: 'shoes' }),
      ClothingItem.find({ $and: and, category: 'outerwear' }),
      ClothingItem.find({ $and: and, category: 'accessory' }),
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

    await PackingList.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        startDate,
        endDate,
        days,
        occasion: occasion ? occasion.toLowerCase() : '',
        weather,
        targetSeason,
        tops: packingList.tops.map((i) => i._id),
        bottoms: packingList.bottoms.map((i) => i._id),
        shoes: packingList.shoes.map((i) => i._id),
        outerwear: packingList.outerwear.map((i) => i._id),
        accessories: packingList.accessories.map((i) => i._id),
      },
      { upsert: true }
    );

    res.json({ days, weather, targetSeason, occasion: occasion || '', packingList });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/suggestion/packing/latest
// Returns the most recently generated packing list for this user, if any,
// so the screen can restore it after being reopened.
exports.getLatestPacking = async (req, res) => {
  try {
    const saved = await PackingList.findOne({ user: req.user._id }).populate(
      'tops bottoms shoes outerwear accessories'
    );
    if (!saved) return res.json(null);

    res.json({
      startDate: saved.startDate,
      endDate: saved.endDate,
      days: saved.days,
      occasion: saved.occasion,
      weather: saved.weather,
      targetSeason: saved.targetSeason,
      packingList: {
        tops: saved.tops,
        bottoms: saved.bottoms,
        shoes: saved.shoes,
        outerwear: saved.outerwear,
        accessories: saved.accessories,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Weighted random pick: items untouched in longer (or never worn) get a much
// higher chance of being picked, but everything has *some* chance — this is
// what makes "Surprise Me" feel different from Today's more deterministic pick.
const weightedRandomPick = (items) => {
  if (!items.length) return null;
  const now = Date.now();
  const weights = items.map((it) => {
    if (!it.lastWornAt) return 30; // never worn: strong favorite
    const daysSince = Math.max(0, (now - new Date(it.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(30, daysSince)); // clamp 1–30 so nothing is ever a zero chance
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
};

// GET /api/suggestion/surprise?occasion=&lat=&lon=
// A playful "shuffle" alternative to /today: weighted-random per category
// instead of always picking the single freshest item, so re-rolling gives a
// genuinely different combo most of the time.
exports.surprise = async (req, res) => {
  try {
    const { lat, lon, occasion } = req.query;
    const weather = await getWeather(lat, lon);
    const targetSeason = seasonFromWeather(weather);

    const seasonOr = [{ season: targetSeason }, { season: 'all' }];
    const and = [{ user: req.user._id, inLaundry: false, 'repair.status': { $nin: ['needs_repair', 'in_progress'] } }, { $or: seasonOr }];
    const occOr = occasionOr(occasion);
    if (occOr) and.push({ $or: occOr });

    const [tops, bottoms, shoes, outerwear, accessories] = await Promise.all([
      ClothingItem.find({ $and: and, category: 'top' }),
      ClothingItem.find({ $and: and, category: 'bottom' }),
      ClothingItem.find({ $and: and, category: 'shoes' }),
      ClothingItem.find({ $and: and, category: 'outerwear' }),
      ClothingItem.find({ $and: and, category: 'accessory' }),
    ]);

    const wantsOuterwear = weather.tempC <= 20 || weather.isRainy;
    const rotationDays = req.user.rotationDays || 0;

    const topsRot = rotationPool(tops, rotationDays);
    const bottomsRot = rotationPool(bottoms, rotationDays);
    const shoesRot = rotationPool(shoes, rotationDays);
    const outerwearRot = rotationPool(outerwear, rotationDays);
    const accessoriesRot = rotationPool(accessories, rotationDays);

    const outfit = {
      top: weightedRandomPick(topsRot.pool),
      bottom: weightedRandomPick(bottomsRot.pool),
      shoes: weightedRandomPick(shoesRot.pool),
      outerwear: wantsOuterwear ? weightedRandomPick(outerwearRot.pool) : null,
      accessory: Math.random() < 0.5 ? weightedRandomPick(accessoriesRot.pool) : null,
    };

    const missing = ['top', 'bottom', 'shoes'].filter((k) => !outfit[k]);

    const rotation = {
      days: rotationDays,
      usedCooldown: [
        topsRot.hadToUseCooldown && 'top',
        bottomsRot.hadToUseCooldown && 'bottom',
        shoesRot.hadToUseCooldown && 'shoes',
        wantsOuterwear && outerwearRot.hadToUseCooldown && 'outerwear',
      ].filter(Boolean),
    };

    res.json({ weather, targetSeason, outfit, missing, rotation });
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
        'repair.status': { $nin: ['needs_repair', 'in_progress'] },
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