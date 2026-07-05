const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    occasion: { type: String, default: 'casual', trim: true, lowercase: true },
    season: { type: String, enum: ['summer', 'winter', 'monsoon', 'all'], default: 'all' },
    favorite: { type: Boolean, default: false },
    wearCount: { type: Number, default: 0 },
    lastWornAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Outfit', outfitSchema);
