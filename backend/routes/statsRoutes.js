const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  overview, costPerWear, mostWorn, leastWorn, wearTimeline,
} = require('../controllers/statsController');

router.use(protect);
router.get('/overview', overview);
router.get('/cost-per-wear', costPerWear);
router.get('/most-worn', mostWorn);
router.get('/least-worn', leastWorn);
router.get('/wear-timeline', wearTimeline);

module.exports = router;
