const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { signupValidation, loginValidation, restaurantSetupValidation } = require('../middleware/validation');
const { uploadRestaurantImage } = require('../middleware/upload');

// @route   POST /api/auth/signup
// @desc    Register restaurant owner (Step 1: User details)
// @access  Public
router.post('/signup', signupValidation, authController.signup);

// @route   POST /api/auth/setup-restaurant
// @desc    Setup restaurant (Step 2: Restaurant details)
// @access  Private
router.post('/setup-restaurant', authenticate, uploadRestaurantImage, restaurantSetupValidation, authController.setupRestaurant);

// @route   POST /api/auth/login
// @desc    Login restaurant owner
// @access  Public
router.post('/login', loginValidation, authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, authController.getMe);

// @route   POST /api/auth/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', authenticate, authController.getNotifications);

// @route   POST /api/auth/markNotificationAsRead
// @desc    Mark notification as read
// @access  Private
router.put('/markNotificationAsRead/:id', authenticate, authController.markNotificationAsRead);

// @route   POST /api/auth/deleteNotification
// @desc    Delete notification
// @access  Private
router.delete('/deleteNotification/:id', authenticate, authController.deleteNotification);


module.exports = router;

