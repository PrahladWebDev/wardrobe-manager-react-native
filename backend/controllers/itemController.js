const cloudinary = require('../config/cloudinary');
const ClothingItem = require('../models/ClothingItem');
const WearLog = require('../models/WearLog');
const { removeBackgroundFromBuffer } = require('../utils/removeBackground');
const { lookupBarcode } = require('../utils/barcodeLookup');
const { scanReceipt } = require('../utils/ocr');

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
async function uploadOneFile(file, removeBg) {
  let buffer = file.buffer;
  if (removeBg) {
    const result = await removeBackgroundFromBuffer(buffer, file.originalname);
    if (result.success) buffer = result.buffer;
  }
  const uploaded = await uploadBufferToCloudinary(buffer);
  return uploaded.secure_url;
}

// Uploads every file in req.files (multer .array('images', 6)) in parallel and
// returns the resulting Cloudinary secure_urls, in the same order they were sent.
async function resolveUploadedImageUrls(req) {
  const removeBg = req.body.removeBackground === 'true' || req.body.removeBackground === true;
  const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);
  if (!files.length) return [];
  return Promise.all(files.map((f) => uploadOneFile(f, removeBg)));
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

// POST /api/items  (multipart field: images[], up to 6)
exports.createItem = async (req, res) => {
  try {
    const { name, category, color, season, occasions, brand, price, notes, favorite } = req.body;
    if (!name || !category) return res.status(400).json({ message: 'name and category are required' });

    let images = [];
    if (req.body.imageUrl) images = [req.body.imageUrl];
    const uploaded = await resolveUploadedImageUrls(req);
    if (uploaded.length) images = uploaded;

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
      images,
      imageUrl: images[0] || '',
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
// New photos (if any) are appended to the existing gallery. Pass
// removeImages: ["<url>", ...] (JSON array or comma-separated string) in the
// body to drop specific photos from the gallery at the same time.
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

    let images = item.images && item.images.length ? [...item.images] : (item.imageUrl ? [item.imageUrl] : []);

    if (req.body.removeImages !== undefined) {
      let toRemove = req.body.removeImages;
      try { toRemove = typeof toRemove === 'string' ? JSON.parse(toRemove) : toRemove; } catch (_) {
        toRemove = String(toRemove).split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (Array.isArray(toRemove) && toRemove.length) {
        images = images.filter((url) => !toRemove.includes(url));
      }
    }

    const uploaded = await resolveUploadedImageUrls(req);
    if (uploaded.length) images = [...images, ...uploaded];

    item.images = images;
    item.imageUrl = images[0] || '';

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

// GET /api/items/lookup-barcode?code=012345678905
// Used by the "Scan Barcode" quick-add flow to pre-fill name/brand/price.
exports.lookupBarcodeCode = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'code query param is required' });
    const result = await lookupBarcode(code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/items/scan-receipt  (multipart field: image)
// Used by the "Scan Receipt" quick-add flow to pre-fill name/price via OCR.
exports.scanReceiptImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'image file is required' });
    const result = await scanReceipt(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
