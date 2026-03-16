const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const restaurantRoutes = require('./restaurantRoutes');
const orderRoutes = require('./orderRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const scanRoutes = require('./scanRoutes');
const adminRoutes = require('./adminRoutes');
const customerRoutes = require('./customerRoutes');
const deliveryPartnerRoutes = require('./deliveryPartnerRoutes');

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/orders', orderRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/captain', deliveryPartnerRoutes);
router.use('/', scanRoutes);

module.exports = router;

