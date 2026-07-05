const mongoose = require('mongoose');

const wearLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
    outfit: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', default: null },
    wornAt: { type: Date, default: Date.now },
    occasion: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WearLog', wearLogSchema);
