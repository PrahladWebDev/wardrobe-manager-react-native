const mongoose = require('mongoose');

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const SEASONS = ['summer', 'winter', 'monsoon', 'all'];

const clothingItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    color: { type: String, default: '' },
    season: { type: String, enum: SEASONS, default: 'all' },
    occasions: [{ type: String, trim: true, lowercase: true }],
    // imageUrl stays as the "cover" photo (images[0]) so every existing screen
    // that only reads imageUrl keeps working untouched.
    imageUrl: { type: String, default: '' },
    // Full photo gallery for this item (front/back/detail/etc). imageUrl is
    // kept in sync with images[0] whenever images changes.
    images: [{ type: String }],
    brand: { type: String, default: '' },
    price: { type: Number, default: 0, min: 0 },
    wearCount: { type: Number, default: 0 },
    lastWornAt: { type: Date, default: null },
    inLaundry: { type: Boolean, default: false },
    favorite: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

clothingItemSchema.virtual('costPerWear').get(function () {
  if (!this.price || this.price <= 0) return 0;
  const wears = this.wearCount > 0 ? this.wearCount : 1;
  return Math.round((this.price / wears) * 100) / 100;
});

clothingItemSchema.set('toJSON', { virtuals: true });
clothingItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClothingItem', clothingItemSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SEASONS = SEASONS;
