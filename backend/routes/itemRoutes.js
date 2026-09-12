const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getItems, getItem, createItem, updateItem, deleteItem, toggleLaundry, logWear,
  lookupBarcodeCode, scanReceiptImage, updateRepair, getRepairs,
} = require('../controllers/itemController');

router.use(protect);
router.get('/', getItems);
router.post('/', upload.array('images', 6), createItem);
router.get('/lookup-barcode', lookupBarcodeCode);
router.post('/scan-receipt', upload.single('image'), scanReceiptImage);
router.get('/repairs', getRepairs);
router.get('/:id', getItem);
router.put('/:id', upload.array('images', 6), updateItem);
router.delete('/:id', deleteItem);
router.patch('/:id/laundry', toggleLaundry);
router.post('/:id/wear', logWear);
router.put('/:id/repair', updateRepair);

module.exports = router;
