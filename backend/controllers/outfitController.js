const Outfit = require('../models/Outfit');
const WearLog = require('../models/WearLog');

// GET /api/outfits?page=&limit=
exports.getOutfits = async (req, res) => {
  try {
    const { occasion, season, favorite } = req.query;
    const filter = { user: req.user._id };
    if (occasion) filter.occasion = occasion.toLowerCase();
    if (season) filter.season = season;
    if (favorite !== undefined) filter.favorite = favorite === 'true';

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [outfits, total] = await Promise.all([
      Outfit.find(filter).populate('items').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Outfit.countDocuments(filter),
    ]);

    res.json({
      outfits,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasMore: skip + outfits.length < total },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/outfits/:id
exports.getOutfit = async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, user: req.user._id }).populate('items');
    if (!outfit) return res.status(404).json({ message: 'Outfit not found' });
    res.json({ outfit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/outfits
exports.createOutfit = async (req, res) => {
  try {
    const { name, items, occasion, season, notes, favorite } = req.body;
    if (!name || !items || !items.length) {
      return res.status(400).json({ message: 'name and at least one item are required' });
    }
    const outfit = await Outfit.create({
      user: req.user._id,
      name,
      items,
      occasion: occasion || 'casual',
      season: season || 'all',
      notes,
      favorite: !!favorite,
    });
    const populated = await outfit.populate('items');
    res.status(201).json({ outfit: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/outfits/:id
exports.updateOutfit = async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, user: req.user._id });
    if (!outfit) return res.status(404).json({ message: 'Outfit not found' });
    const fields = ['name', 'items', 'occasion', 'season', 'notes', 'favorite'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) outfit[f] = req.body[f];
    });
    await outfit.save();
    const populated = await outfit.populate('items');
    res.json({ outfit: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/outfits/:id
exports.deleteOutfit = async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!outfit) return res.status(404).json({ message: 'Outfit not found' });
    await WearLog.deleteMany({ outfit: outfit._id });
    res.json({ message: 'Outfit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/outfits/:id/wear
exports.logWear = async (req, res) => {
  try {
    const ClothingItem = require('../models/ClothingItem');
    const outfit = await Outfit.findOne({ _id: req.params.id, user: req.user._id });
    if (!outfit) return res.status(404).json({ message: 'Outfit not found' });
    outfit.wearCount += 1;
    outfit.lastWornAt = new Date();
    await outfit.save();
    await WearLog.create({ user: req.user._id, outfit: outfit._id, occasion: req.body.occasion || '' });
    // bump wear count on each item too
    await ClothingItem.updateMany(
      { _id: { $in: outfit.items } },
      { $inc: { wearCount: 1 }, $set: { lastWornAt: new Date() } }
    );
    res.json({ outfit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
