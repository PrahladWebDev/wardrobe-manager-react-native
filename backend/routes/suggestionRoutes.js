const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { today, packing } = require('../controllers/suggestionController');

router.use(protect);
router.get('/today', today);
router.post('/packing', packing);

module.exports = router;
