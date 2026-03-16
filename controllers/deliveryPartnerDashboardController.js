const { DeliveryPartnerProfile, Order, DeliveryPartnerEarning, DeliveryPartnerRating } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get Dashboard Data
 * @route   GET /api/captain/dashboard
 * @access  Private
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.query;

    const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found'
        }
      });
    }

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await Order.findAll({
      where: {
        deliveryPartnerId: userId,
        deliveredAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'delivered'
      }
    });

    const todayEarnings = await DeliveryPartnerEarning.findAll({
      where: {
        userId,
        date: today.toISOString().split('T')[0],
        status: 'credited'
      }
    });

    const totalEarnings = todayEarnings.reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
    const totalDeliveries = todayOrders.length;

    // Get average rating
    const ratings = await DeliveryPartnerRating.findAll({ where: { userId } });
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Active deliveries
    const activeDeliveries = await Order.count({
      where: {
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['assigned', 'picked_up', 'in_transit']
        }
      }
    });

    // Available deliveries (simplified - you may want to use the actual available deliveries endpoint)
    const availableDeliveries = await Order.count({
      where: {
        status: 'ready',
        deliveryPartnerId: null
      }
    });

    // Recent activity
    const recentOrders = await Order.findAll({
      where: {
        deliveryPartnerId: userId,
        status: 'delivered'
      },
      order: [['deliveredAt', 'DESC']],
      limit: 5
    });

    const recentActivity = recentOrders.map(order => ({
      type: 'delivery_completed',
      message: `Order ${order.orderNumber} delivered`,
      timestamp: order.deliveredAt
    }));

    res.json({
      success: true,
      dashboard: {
        status: profile.isOnline ? 'online' : 'offline',
        todayStats: {
          totalDeliveries,
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          averageRating: parseFloat(averageRating.toFixed(2)),
          activeDeliveries
        },
        availableDeliveries,
        quickActions: {
          canGoOnline: !profile.isOnline,
          canGoOffline: profile.isOnline,
          hasActiveDelivery: activeDeliveries > 0
        },
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

