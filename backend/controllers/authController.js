const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

// Streams a buffer up to Cloudinary and resolves with the resulting secure_url.
function uploadAvatarBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'wardrobe-manager/avatars', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: genToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: genToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

// PUT /api/auth/me
exports.updateMe = async (req, res) => {
  try {
    const { name, homeCity, homeLat, homeLon, avatarUrl } = req.body;
    const user = req.user;
    if (name !== undefined) user.name = name;
    if (homeCity !== undefined) user.homeCity = homeCity;
    if (homeLat !== undefined) user.homeLat = homeLat;
    if (homeLon !== undefined) user.homeLon = homeLon;
    if (req.file) {
      const uploaded = await uploadAvatarBuffer(req.file.buffer);
      user.avatarUrl = uploaded.secure_url;
    } else if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }
    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};