const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, isRestaurantOwner } = require('../middleware/auth');

// All routes require authentication and restaurant owner role
router.use(authenticate);
router.use(isRestaurantOwner);

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get('/', orderController.getOrders);

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', orderController.getOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;

