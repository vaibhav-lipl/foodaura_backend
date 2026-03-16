const { Restaurant, Order, OrderItem, Menu, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getOrCreateRestaurant } = require('../utils/restaurantHelper');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get or create restaurant
    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's orders
    const todayOrders = await Order.findAll({
      where: {
        restaurantId: restaurant.id,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Today's sales
    const todaySales = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.total || 0);
    }, 0);

    // Today's earnings (total - delivery fees if applicable)
    const todayEarnings = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.subtotal || 0) - parseFloat(order.discount || 0);
    }, 0);

    // Today's orders count
    const todayOrdersCount = todayOrders.length;

    // Recent orders (last 10)
    const recentOrders = await Order.findAll({
      where: { restaurantId: restaurant.id },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Menu,
          as: 'menu',
          attributes: ['id', 'name', 'price']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          isOpen: restaurant.isOpen
        },
        todayStats: {
          sales: todaySales,
          earnings: todayEarnings,
          orders: todayOrdersCount
        },
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle restaurant open/close status
// @route   PUT /api/dashboard/toggle-status
// @access  Private
exports.toggleRestaurantStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    res.json({
      success: true,
      message: `Restaurant ${restaurant.isOpen ? 'opened' : 'closed'} successfully`,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          isOpen: restaurant.isOpen
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

