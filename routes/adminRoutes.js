const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingController = require('../controllers/settingController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { body } = require('express-validator');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Admin Dashboard
router.get('/dashboard', adminController.getDashboard);

// Admin Profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim()
], adminController.updateProfile);

// Admin Password Change
router.put('/password', [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], adminController.changePassword);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['admin', 'restaurant', 'delivery_partner', 'customer']),
  body('isActive').optional().isBoolean()
], adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Restaurant Management
router.get('/restaurants', adminController.getRestaurants);
router.put('/restaurants/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], adminController.updateRestaurantStatus);

// Delivery Partner Management
router.get('/delivery-partners', adminController.getDeliveryPartners);
router.put('/delivery-partners/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], adminController.updateDeliveryPartnerStatus);
router.get('/delivery-partners/:userId', adminController.getDeliveryPartnerDetails);


// Settings Management
router.get('/settings', settingController.getSettings);
router.put('/settings', settingController.updateSettings);

module.exports = router;

