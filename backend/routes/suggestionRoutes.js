const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { today, packing, getLatestPacking, completeLook, surprise } = require('../controllers/suggestionController');

router.use(protect);
router.get('/today', today);
router.get('/surprise', surprise);
router.post('/packing', packing);
router.get('/packing/latest', getLatestPacking);
router.get('/complete-look/:itemId', completeLook);

module.exports = router;