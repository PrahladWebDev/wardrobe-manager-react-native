const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getItems, getItem, createItem, updateItem, deleteItem, toggleLaundry, logWear,
} = require('../controllers/itemController');

router.use(protect);
router.get('/', getItems);
router.post('/', upload.single('image'), createItem);
router.get('/:id', getItem);
router.put('/:id', upload.single('image'), updateItem);
router.delete('/:id', deleteItem);
router.patch('/:id/laundry', toggleLaundry);
router.post('/:id/wear', logWear);

module.exports = router;
