const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, isRestaurantOwner } = require('../middleware/auth');

// All routes require authentication and restaurant owner role
router.use(authenticate);
router.use(isRestaurantOwner);

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/', dashboardController.getDashboard);

// @route   PUT /api/dashboard/toggle-status
// @desc    Toggle restaurant open/close status
// @access  Private
router.put('/toggle-status', dashboardController.toggleRestaurantStatus);

module.exports = router;

