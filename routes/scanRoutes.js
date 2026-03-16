const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create scan upload directory if it doesn't exist
const scanUploadDir = path.join(__dirname, '../uploads/scan');
if (!fs.existsSync(scanUploadDir)) {
  fs.mkdirSync(scanUploadDir, { recursive: true });
}

// Configure multer for scan endpoint
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, scanUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   POST /api/scan-food
// @desc    Scan and validate food image quality
// @access  Public
router.post('/scan-food', upload.single('image'), scanController.scanFood);

module.exports = router;

