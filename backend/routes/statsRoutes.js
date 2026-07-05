const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  overview, costPerWear, mostWorn, leastWorn, wearTimeline, wearCalendar, wearOnDate,
} = require('../controllers/statsController');

router.use(protect);
router.get('/overview', overview);
router.get('/cost-per-wear', costPerWear);
router.get('/most-worn', mostWorn);
router.get('/least-worn', leastWorn);
router.get('/wear-timeline', wearTimeline);
router.get('/wear-calendar', wearCalendar);
router.get('/wear-on-date', wearOnDate);

module.exports = router;