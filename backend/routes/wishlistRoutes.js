const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getWishlist, getWishlistItem, createWishlistItem, updateWishlistItem, deleteWishlistItem, togglePurchased,
} = require('../controllers/wishlistController');

router.use(protect);
router.get('/', getWishlist);
router.post('/', createWishlistItem);
router.get('/:id', getWishlistItem);
router.put('/:id', updateWishlistItem);
router.delete('/:id', deleteWishlistItem);
router.patch('/:id/purchased', togglePurchased);

module.exports = router;
