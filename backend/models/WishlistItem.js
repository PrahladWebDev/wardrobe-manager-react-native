const mongoose = require('mongoose');
const { CATEGORIES } = require('./ClothingItem');

const PRIORITIES = ['low', 'medium', 'high'];

const wishlistItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: undefined },
    brand: { type: String, default: '' },
    estimatedPrice: { type: Number, default: 0, min: 0 },
    link: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    notes: { type: String, default: '' },
    purchased: { type: Boolean, default: false },
    purchasedAt: { type: Date, default: null },
    // Set when "Mark Purchased" also creates a real wardrobe item for it.
    linkedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);
module.exports.PRIORITIES = PRIORITIES;
