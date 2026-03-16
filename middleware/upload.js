const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Create upload directories if they don't exist
const uploadDirs = {
  restaurant: path.join(__dirname, '../uploads/restaurants'),
  menu: path.join(__dirname, '../uploads/menus'),
  offer: path.join(__dirname, '../uploads/offers'),
  profileImage: path.join(__dirname, '../uploads/profile-images'),
  document: path.join(__dirname, '../uploads/documents'),
};

Object.values(uploadDirs).forEach(dir => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on field name
    if (file.fieldname === 'restaurantImage') {
      cb(null, uploadDirs.restaurant);
    } else if (file.fieldname === 'menuImage') {
      cb(null, uploadDirs.menu);
    } else if (file.fieldname === 'offerImage') { // ✅ ADD
      cb(null, uploadDirs.offer);
    } else if (file.fieldname === 'profileImage') {
      cb(null, uploadDirs.profileImage);
    } else if (file.fieldname === 'document') {
      cb(null, uploadDirs.document);
    } else {
      cb(new Error('Invalid field name'), null);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware for restaurant image upload
exports.uploadRestaurantImage = upload.single('restaurantImage');

// Middleware for menu image upload
exports.uploadMenuImage = upload.single('menuImage');

// Middleware for offer image upload ✅ ADD
exports.uploadOfferImage = upload.single('offerImage');

// Middleware for profile image upload
exports.uploadProfileImage = upload.single('profileImage');

// Helper function to get image URL
// Can be called with (req, filename, type) or (filename, type)
exports.getImageUrl = (reqOrFilename, filenameOrType, type) => {
  let filename, imageType, baseUrl;

  // Determine if first param is req object or filename
  if (reqOrFilename && typeof reqOrFilename === 'object' && reqOrFilename.get) {
    // Called as (req, filename, type)
    const req = reqOrFilename;
    filename = filenameOrType;
    imageType = type;
    baseUrl = req.protocol + '://' + req.get('host');
  } else {
    // Called as (filename, type) - no req provided
    filename = reqOrFilename;
    imageType = filenameOrType;
    // Use environment variable or default
    baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:3000';
  }

  if (!filename) return null;

  // Extract just the filename if it's a full path or URL
  const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;

  if (imageType === 'restaurant') {
    return `${baseUrl}/uploads/restaurants/${justFilename}`;
  } else if (imageType === 'menu') {
    return `${baseUrl}/uploads/menus/${justFilename}`;
  } else if (imageType === 'scan') {
    return `${baseUrl}/uploads/scan/${justFilename}`;
  } else if (imageType === 'offer') { // ✅ ADD
    return `${baseUrl}/uploads/offers/${justFilename}`;
  } else if (imageType === 'profileImage') {
    return `${baseUrl}/uploads/profile-images/${justFilename}`;
  } else if (imageType === 'document') {
    return `${baseUrl}/uploads/documents/${justFilename}`;
  }
  return null;
};

// Helper function to delete old image file
exports.deleteImageFile = (imagePath) => {
  if (imagePath) {
    const fullPath = path.join(__dirname, '../', imagePath);
    if (fsSync.existsSync(fullPath)) {
      fsSync.unlinkSync(fullPath);
    }
  }
};

// Extract filename from URL or path
exports.extractFilename = (imageUrl) => {
  if (!imageUrl) return null;

  // If it's a full URL, extract the filename
  if (imageUrl.includes('/uploads/')) {
    return imageUrl.split('/').pop();
  }

  // If it's already just a filename
  return imageUrl;
};

