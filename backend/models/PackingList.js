const mongoose = require('mongoose');

// Stores the most recently generated packing list per user so it survives
// navigating away and reopening the Packing List screen. One document per
// user (upserted on every generate) rather than a history table, since the
// screen only ever needs to show "your current trip".
const packingListSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true },
    occasion: { type: String, default: '', trim: true, lowercase: true },
    weather: {
      tempC: Number,
      condition: String,
      isRainy: Boolean,
      mocked: Boolean,
    },
    targetSeason: { type: String, enum: ['summer', 'winter', 'monsoon', 'all'], default: 'all' },
    tops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    bottoms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    shoes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    outerwear: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    accessories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PackingList', packingListSchema);