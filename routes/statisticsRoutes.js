const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authenticate, isRestaurantOwner } = require('../middleware/auth');

// All routes require authentication and restaurant owner role
router.use(authenticate);
router.use(isRestaurantOwner);

// @route   GET /api/statistics
// @desc    Get statistics
// @access  Private
router.get('/', statisticsController.getStatistics);

module.exports = router;

