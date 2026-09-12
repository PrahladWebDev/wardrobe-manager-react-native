const WishlistItem = require('../models/WishlistItem');
const ClothingItem = require('../models/ClothingItem');

// GET /api/wishlist?purchased=&priority=&category=
exports.getWishlist = async (req, res) => {
  try {
    const { purchased, priority, category } = req.query;
    const filter = { user: req.user._id };
    if (purchased !== undefined) filter.purchased = purchased === 'true';
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const items = await WishlistItem.find(filter).sort({ purchased: 1, priority: 1, createdAt: -1 });

    const active = items.filter((i) => !i.purchased);
    const summary = {
      count: active.length,
      totalEstimated: active.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0),
      highPriorityCount: active.filter((i) => i.priority === 'high').length,
    };

    res.json({ items, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/wishlist/:id
exports.getWishlistItem = async (req, res) => {
  try {
    const item = await WishlistItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Wishlist item not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/wishlist
exports.createWishlistItem = async (req, res) => {
  try {
    const { name, category, brand, estimatedPrice, link, imageUrl, priority, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'name is required' });

    const item = await WishlistItem.create({
      user: req.user._id,
      name: name.trim(),
      category: category || undefined,
      brand: brand || '',
      estimatedPrice: Math.max(0, Number(estimatedPrice) || 0),
      link: link || '',
      imageUrl: imageUrl || '',
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      notes: notes || '',
    });

    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/wishlist/:id
exports.updateWishlistItem = async (req, res) => {
  try {
    const item = await WishlistItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Wishlist item not found' });

    const fields = ['name', 'category', 'brand', 'link', 'imageUrl', 'priority', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    if (req.body.estimatedPrice !== undefined) {
      item.estimatedPrice = Math.max(0, Number(req.body.estimatedPrice) || 0);
    }

    await item.save();
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/wishlist/:id
exports.deleteWishlistItem = async (req, res) => {
  try {
    const item = await WishlistItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Wishlist item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/wishlist/:id/purchased
// Body: { purchased: true/false, addToWardrobe: true/false }
// Marking purchased can optionally create a real ClothingItem right away so
// the person doesn't have to re-enter the same details twice.
exports.togglePurchased = async (req, res) => {
  try {
    const item = await WishlistItem.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Wishlist item not found' });

    const purchased = req.body.purchased !== undefined ? !!req.body.purchased : !item.purchased;
    item.purchased = purchased;
    item.purchasedAt = purchased ? new Date() : null;

    if (purchased && req.body.addToWardrobe && !item.linkedItem) {
      const newItem = await ClothingItem.create({
        user: req.user._id,
        name: item.name,
        category: item.category || 'top',
        brand: item.brand,
        price: item.estimatedPrice,
        imageUrl: item.imageUrl,
        images: item.imageUrl ? [item.imageUrl] : [],
      });
      item.linkedItem = newItem._id;
    }

    await item.save();
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
