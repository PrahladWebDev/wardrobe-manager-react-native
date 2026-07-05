const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOutfits, getOutfit, createOutfit, updateOutfit, deleteOutfit, logWear,
} = require('../controllers/outfitController');

router.use(protect);
router.get('/', getOutfits);
router.post('/', createOutfit);
router.get('/:id', getOutfit);
router.put('/:id', updateOutfit);
router.delete('/:id', deleteOutfit);
router.post('/:id/wear', logWear);

module.exports = router;
