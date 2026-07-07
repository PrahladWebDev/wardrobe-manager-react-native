const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { today, packing, getLatestPacking, completeLook } = require('../controllers/suggestionController');

router.use(protect);
router.get('/today', today);
router.post('/packing', packing);
router.get('/packing/latest', getLatestPacking);
router.get('/complete-look/:itemId', completeLook);

module.exports = router;