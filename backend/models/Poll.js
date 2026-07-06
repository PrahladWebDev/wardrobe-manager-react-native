const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema(
  {
    outfit: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', required: true },
    label: { type: String, default: '' },
    votes: { type: Number, default: 0 },
    // deviceIds that already voted for THIS option (used across the whole poll
    // to stop one device voting twice, see Poll.hasVoted below).
    voterDeviceIds: [{ type: String }],
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: String, default: 'Which outfit should I wear?' },
    options: [pollOptionSchema],
    // Short shareable code, e.g. "F7K2QX", used instead of a Mongo ObjectId
    // so it's easy to read out loud / type in by whoever is voting.
    code: { type: String, required: true, unique: true, index: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pollSchema.methods.hasDeviceVoted = function (deviceId) {
  if (!deviceId) return false;
  return this.options.some((o) => o.voterDeviceIds.includes(deviceId));
};

module.exports = mongoose.model('Poll', pollSchema);
