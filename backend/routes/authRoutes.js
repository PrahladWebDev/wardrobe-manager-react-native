const express = require('express');
const router = express.Router();
const { register, login, me, updateMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/me', protect, updateMe);

module.exports = router;
