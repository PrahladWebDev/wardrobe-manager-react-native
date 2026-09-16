const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Short-lived one-time codes for email verification and password reset.
// Only the bcrypt hash of the code is stored, never the code itself.
// Mongo's TTL monitor deletes each document at `expiresAt`, so expired codes
// clean themselves up without a cron job.
const emailTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ['verify', 'reset'] },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    // Wrong guesses. Blown past MAX_ATTEMPTS and the code is burned.
    attempts: { type: Number, default: 0 },
    // Used to throttle "resend" taps.
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One live code per (email, purpose) — a resend replaces the previous code.
emailTokenSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

emailTokenSchema.statics.CODE_TTL_MS = CODE_TTL_MS;
emailTokenSchema.statics.RESEND_COOLDOWN_MS = RESEND_COOLDOWN_MS;
emailTokenSchema.statics.MAX_ATTEMPTS = MAX_ATTEMPTS;

// crypto.randomInt is uniform — Math.random() is not, and this is a secret.
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Creates (or replaces) the active code for an email + purpose.
 * Returns { code, secondsUntilResend } — `code` is plaintext and must only
 * ever leave this process inside the outgoing email.
 * Throws a { status: 429 } error if the caller is tapping resend too fast.
 */
emailTokenSchema.statics.issue = async function issue(email, purpose) {
  const normalized = (email || '').toLowerCase().trim();
  const existing = await this.findOne({ email: normalized, purpose });

  if (existing) {
    const since = Date.now() - new Date(existing.lastSentAt).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000);
      const err = new Error(`Please wait ${wait}s before requesting another code`);
      err.status = 429;
      err.retryAfter = wait;
      throw err;
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await this.findOneAndUpdate(
    { email: normalized, purpose },
    {
      email: normalized,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { code, expiresInMinutes: Math.round(CODE_TTL_MS / 60000) };
};

/**
 * Checks a submitted code. Consumes (deletes) the token on success so a code
 * can never be replayed. Throws a { status } error describing the failure.
 */
emailTokenSchema.statics.consume = async function consume(email, purpose, code) {
  const normalized = (email || '').toLowerCase().trim();
  const token = await this.findOne({ email: normalized, purpose });

  const invalid = () => {
    const err = new Error('That code is invalid or has expired. Request a new one.');
    err.status = 400;
    return err;
  };

  if (!token) throw invalid();
  if (token.expiresAt.getTime() < Date.now()) {
    await token.deleteOne();
    throw invalid();
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    await token.deleteOne();
    const err = new Error('Too many incorrect attempts. Request a new code.');
    err.status = 429;
    throw err;
  }

  const ok = await bcrypt.compare(String(code || '').trim(), token.codeHash);
  if (!ok) {
    token.attempts += 1;
    await token.save();
    const left = MAX_ATTEMPTS - token.attempts;
    const err = new Error(
      left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Request a new code.'
    );
    err.status = 400;
    throw err;
  }

  await token.deleteOne();
  return true;
};

module.exports = mongoose.model('EmailToken', emailTokenSchema);
