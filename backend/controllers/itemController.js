const cloudinary = require('../config/cloudinary');
const ClothingItem = require('../models/ClothingItem');
const WearLog = require('../models/WearLog');
const { removeBackgroundFromBuffer } = require('../utils/removeBackground');

// Streams buffer up to Cloudinary and resolves with the resulting secure_url.
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'wardrobe-manager', resource_type: 'image', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// If removeBackground was requested and a key is configured, swap in the
// background-removed buffer; otherwise upload the original buffer untouched.
// Either way, returns the Cloudinary secure_url for the uploaded image.
async function resolveUploadedImageUrl(req) {
  let buffer = req.file.buffer;
  if (req.body.removeBackground === 'true' || req.body.removeBackground === true) {
    const result = await removeBackgroundFromBuffer(buffer, req.file.originalname);
    if (result.success) buffer = result.buffer;
  }
  const uploaded = await uploadBufferToCloudinary(buffer);
  return uploaded.secure_url;
}

// GET /api/items?category=&season=&occasion=&search=&inLaundry=&favorite=&page=&limit=
exports.getItems = async (req, res) => {
  try {
    const { category, season, occasion, search, inLaundry, favorite } = req.query;
    const filter = { user: req.user._id };
    if (category) filter.category = category;
    if (season) filter.season = season;
    if (occasion) filter.occasions = occasion.toLowerCase();
    if (inLaundry !== undefined) filter.inLaundry = inLaundry === 'true';
    if (favorite !== undefined) filter.favorite = favorite === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ClothingItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ClothingItem.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasMore: skip + items.length < total },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/items/:id
exports.getItem = async (req, res) => {
  try {
    const item = await ClothingItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/items
exports.createItem = async (req, res) => {
  try {
    const { name, category, color, season, occasions, brand, price, notes, favorite } = req.body;
    if (!name || !category) return res.status(400).json({ message: 'name and category are required' });

    let imageUrl = req.body.imageUrl || '';
    if (req.file) imageUrl = await resolveUploadedImageUrl(req);

    const occasionsArr = Array.isArray(occasions)
      ? occasions
      : (occasions || '').split(',').map((o) => o.trim()).filter(Boolean);

    const item = await ClothingItem.create({
      user: req.user._id,
      name,
      category,
      color,
      season: season || 'all',
      occasions: occasionsArr,
      imageUrl,
      brand,
      price: Number(price) || 0,
      notes,
      favorite: favorite === 'true' || favorite === true,
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res) => {
  try {
    const item = await ClothingItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const fields = ['name', 'category', 'color', 'season', 'brand', 'notes', 'inLaundry', 'favorite'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    if (req.body.price !== undefined) item.price = Number(req.body.price) || 0;
    if (req.body.occasions !== undefined) {
      item.occasions = Array.isArray(req.body.occasions)
        ? req.body.occasions
        : req.body.occasions.split(',').map((o) => o.trim()).filter(Boolean);
    }
    if (req.file) item.imageUrl = await resolveUploadedImageUrl(req);
    else if (req.body.imageUrl !== undefined) item.imageUrl = req.body.imageUrl;

    await item.save();
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res) => {
  try {
    const item = await ClothingItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await WearLog.deleteMany({ item: item._id });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/items/:id/laundry  { inLaundry: true/false }
exports.toggleLaundry = async (req, res) => {
  try {
    const item = await ClothingItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.inLaundry = req.body.inLaundry !== undefined ? !!req.body.inLaundry : !item.inLaundry;
    await item.save();
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/items/:id/wear
exports.logWear = async (req, res) => {
  try {
    const item = await ClothingItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.wearCount += 1;
    item.lastWornAt = new Date();
    await item.save();
    await WearLog.create({ user: req.user._id, item: item._id, occasion: req.body.occasion || '' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};