const multer = require('multer');

// Files are held in memory as a Buffer and streamed straight to Cloudinary
// (see controllers/itemController.js) instead of being written to local disk.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = upload;