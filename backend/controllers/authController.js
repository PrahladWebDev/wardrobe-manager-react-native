const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailToken = require('../models/EmailToken');
const { sendVerificationCode, sendResetCode } = require('../utils/mailer');
const cloudinary = require('../config/cloudinary');
const ClothingItem = require('../models/ClothingItem');
const Outfit = require('../models/Outfit');
const PackingList = require('../models/PackingList');
const Poll = require('../models/Poll');
const WearLog = require('../models/WearLog');
const WishlistItem = require('../models/WishlistItem');

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (e) => String(e || '').toLowerCase().trim();

// Any error thrown by EmailToken/mailer carries a `status`; everything else
// is a genuine 500.
const fail = (res, err) => res.status(err.status || 500).json({ message: err.message || 'Server error' });

// POST /api/auth/register
// Creates the account in an unverified state and emails a 6-digit code. No
// JWT is returned here — the client must call /verify-email first.
exports.register = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing && existing.emailVerified) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    let user;
    if (existing) {
      // Signup was started before but never verified — let them start over
      // with a fresh name/password rather than locking the address up.
      existing.name = name;
      existing.password = password;
      await existing.save();
      user = existing;
    } else {
      user = await User.create({ name, email, password, emailVerified: false });
    }

    try {
      const { code, expiresInMinutes } = await EmailToken.issue(email, 'verify');
      await sendVerificationCode(email, user.name, code, expiresInMinutes);
    } catch (mailErr) {
      // Don't leave a half-created account behind if the very first send fails.
      if (!existing) await user.deleteOne().catch(() => {});
      return fail(res, mailErr);
    }

    res.status(201).json({
      requiresVerification: true,
      email,
      message: 'We sent a 6-digit code to your email.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/verify-email  { email, code }
// Consumes the code, flips emailVerified and signs the user in.
exports.verifyEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'email and code are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found for that email' });
    if (user.emailVerified) {
      return res.status(400).json({ message: 'This email is already verified. Please log in.' });
    }

    await EmailToken.consume(email, 'verify', code);

    user.emailVerified = true;
    await user.save();

    res.json({ token: genToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    fail(res, err);
  }
};

// POST /api/auth/resend-code  { email, purpose? }
// Throttled to one send per minute per email+purpose by EmailToken.issue.
exports.resendCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === 'reset' ? 'reset' : 'verify';
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await User.findOne({ email });

    // Never confirm or deny that an address has an account.
    if (!user || (purpose === 'verify' && user.emailVerified)) {
      return res.json({ message: 'If that email needs a code, one is on its way.' });
    }

    const { code, expiresInMinutes } = await EmailToken.issue(email, purpose);
    if (purpose === 'reset') await sendResetCode(email, user.name, code, expiresInMinutes);
    else await sendVerificationCode(email, user.name, code, expiresInMinutes);

    res.json({ message: 'Code sent.' });
  } catch (err) {
    fail(res, err);
  }
};

// POST /api/auth/forgot-password  { email }
// Always 200 — replying differently for unknown addresses would let anyone
// enumerate which emails have accounts.
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });

    const user = await User.findOne({ email });
    if (user) {
      try {
        const { code, expiresInMinutes } = await EmailToken.issue(email, 'reset');
        await sendResetCode(email, user.name, code, expiresInMinutes);
      } catch (err) {
        // A 429 is worth surfacing so the UI can show the cooldown.
        if (err.status === 429) return fail(res, err);
        console.error('forgotPassword mail error:', err.message);
      }
    }

    res.json({ message: 'If an account exists for that email, a reset code is on its way.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password  { email, code, password }
// Holding a valid reset code proves control of the inbox, so this also marks
// the address verified and signs the user straight in.
exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ message: 'email, code and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'That code is invalid or has expired. Request a new one.' });

    await EmailToken.consume(email, 'reset', code);

    user.password = password; // hashed by the pre-save hook
    user.emailVerified = true;
    await user.save();

    res.json({ token: genToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    fail(res, err);
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      // Credentials were correct, so quietly push a fresh code (unless the
      // cooldown is still running) and tell the client where to go next.
      try {
        const { code, expiresInMinutes } = await EmailToken.issue(email, 'verify');
        await sendVerificationCode(email, user.name, code, expiresInMinutes);
      } catch (_) {
        // Cooldown or mail hiccup — the Verify screen has its own Resend.
      }
      return res.status(403).json({
        requiresVerification: true,
        email,
        message: 'Please verify your email. We sent you a 6-digit code.',
      });
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
    const { name, homeCity, homeLat, homeLon, avatarUrl, rotationDays } = req.body;
    const user = req.user;
    if (name !== undefined) user.name = name;
    if (homeCity !== undefined) user.homeCity = homeCity;
    if (homeLat !== undefined) user.homeLat = homeLat;
    if (homeLon !== undefined) user.homeLon = homeLon;
    if (rotationDays !== undefined) user.rotationDays = Math.max(0, Math.min(60, Number(rotationDays) || 0));
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

// DELETE /api/auth/me
// Permanently deletes the signed-in user's account and every record tied to
// it (closet items, outfits, wear log, packing list, polls, wishlist).
// Required by Google Play's User Data policy: any app that supports account
// creation must offer in-app account deletion.
exports.deleteMe = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete your account' });
    }
    const user = await User.findById(req.user._id);
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const userId = user._id;
    await Promise.all([
      ClothingItem.deleteMany({ user: userId }),
      Outfit.deleteMany({ user: userId }),
      PackingList.deleteMany({ user: userId }),
      Poll.deleteMany({ user: userId }),
      WearLog.deleteMany({ user: userId }),
      WishlistItem.deleteMany({ user: userId }),
      EmailToken.deleteMany({ email: user.email }),
    ]);

    if (user.avatarUrl && user.avatarUrl.includes('cloudinary')) {
      try {
        const publicId = user.avatarUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`wardrobe-manager/avatars/${publicId}`);
      } catch (_) {
        // Non-fatal — don't block account deletion on a Cloudinary cleanup failure.
      }
    }

    await user.deleteOne();
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};