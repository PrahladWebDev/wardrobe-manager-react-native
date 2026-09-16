const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    // Set true only after the user enters the 6-digit code emailed to them.
    // Login is refused while this is false.
    emailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: '' },
    homeCity: { type: String, default: '' },
    homeLat: { type: Number, default: null },
    homeLon: { type: Number, default: null },
    // Outfit Rotation: how many days an item/outfit should "rest" before
    // suggestions (Today, Surprise Me) will offer it again. 0 disables rotation.
    rotationDays: { type: Number, default: 5, min: 0, max: 60 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    homeCity: this.homeCity,
    homeLat: this.homeLat,
    homeLon: this.homeLon,
    rotationDays: this.rotationDays,
    emailVerified: this.emailVerified,
  };
};

module.exports = mongoose.model('User', userSchema);
