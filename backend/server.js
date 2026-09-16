require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { verifyMailer } = require('./utils/mailer');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const outfitRoutes = require('./routes/outfitRoutes');
const statsRoutes = require('./routes/statsRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const pollRoutes = require('./routes/pollRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'wardrobe-manager-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/suggestion', suggestionRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// error handler (e.g. multer errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Non-blocking: a bad/missing app password logs a warning rather than
  // stopping the API from booting.
  verifyMailer().catch(() => {});
  app.listen(PORT, () => console.log(`🚀 Wardrobe Manager API running on port ${PORT}`));
});
