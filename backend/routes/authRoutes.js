const express = require('express');
const router = express.Router();
const { register, login, me, updateMe, deleteMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/me', protect, upload.single('avatar'), updateMe);
router.delete('/me', protect, deleteMe);

module.exports = router;