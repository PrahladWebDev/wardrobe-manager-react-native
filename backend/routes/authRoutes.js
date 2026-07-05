const express = require('express');
const router = express.Router();
const { register, login, me, updateMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/me', protect, upload.single('avatar'), updateMe);

module.exports = router;