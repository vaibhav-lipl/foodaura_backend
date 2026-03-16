const { Restaurant, Order, OrderItem, Menu, Review, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getOrCreateRestaurant } = require('../utils/restaurantHelper');
const { sanitizeDate } = require('../utils/queryHelper');

// @desc    Get statistics
// @route   GET /api/statistics
// @access  Private
exports.getStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Sanitize and validate query parameters
    const startDate = sanitizeDate(req.query.startDate);
    const endDate = sanitizeDate(req.query.endDate);

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build date filter - only add if dates are valid
    let dateFilter = {};
    if (startDate !== null || endDate !== null) {
      dateFilter.createdAt = {};
      if (startDate !== null) {
        dateFilter.createdAt[Op.gte] = startDate;
      }
      if (endDate !== null) {
        dateFilter.createdAt[Op.lte] = endDate;
      }
    } else {
      // If no valid dates, set to empty object (will be ignored when spread)
      dateFilter = {};
    }

    // Total earnings
    const orders = await Order.findAll({
      where: {
        restaurantId: restaurant.id,
        status: { [Op.ne]: 'cancelled' },
        ...dateFilter
      },
      attributes: [
        'subtotal',
        'discount',
        'total'
      ]
    });

    const totalEarnings = orders.reduce((sum, order) => {
      return sum + parseFloat(order.subtotal || 0) - parseFloat(order.discount || 0);
    }, 0);

    const totalSales = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total || 0);
    }, 0);

    // Total orders
    const totalOrders = orders.length;

    // Ratings & Reviews
    const reviews = await Review.findAll({
      where: {
        restaurantId: restaurant.id,
        ...dateFilter
      }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    // Most sold items
    const orderWhereClause = {
      restaurantId: restaurant.id,
      status: { [Op.ne]: 'cancelled' },
      ...dateFilter
    };

    const orderIds = await Order.findAll({
      where: orderWhereClause,
      attributes: ['id']
    });

    const orderIdArray = orderIds.map(order => order.id);

    const mostSoldItems = await OrderItem.findAll({
      where: {
        orderId: { [Op.in]: orderIdArray }
      },
      include: [{
        model: Menu,
        as: 'menu',
        attributes: ['id', 'name', 'price', 'imageUrl', 'category']
      }],
      attributes: [
        'menuId',
        [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.literal('OrderItem.quantity * OrderItem.price')), 'totalRevenue']
      ],
      group: ['menuId', 'menu.id'],
      order: [[sequelize.literal('totalQuantity'), 'DESC']],
      limit: 10,
      raw: false
    });

    // Orders by status
    const ordersByStatus = await Order.findAll({
      where: {
        restaurantId: restaurant.id,
        ...dateFilter
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Daily sales (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailySales = await Order.findAll({
      where: {
        restaurantId: restaurant.id,
        status: { [Op.ne]: 'cancelled' },
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('total')), 'sales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          totalSales: parseFloat(totalSales.toFixed(2)),
          totalOrders,
          averageRating: parseFloat(averageRating.toFixed(2)),
          totalReviews: reviews.length
        },
        ratings: {
          average: parseFloat(averageRating.toFixed(2)),
          distribution: ratingDistribution,
          reviews: reviews.slice(0, 10) // Latest 10 reviews
        },
        mostSoldItems,
        ordersByStatus,
        dailySales
      }
    });
  } catch (error) {
    next(error);
  }
};

