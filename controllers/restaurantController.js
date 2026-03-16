const { Restaurant, Menu, Schedule, Offer, Order, OrderItem, sequelize, User } = require('../models');
const { validationResult } = require('express-validator');
const { getOrCreateRestaurant } = require('../utils/restaurantHelper');
const { getImageUrl, deleteImageFile, extractFilename } = require('../middleware/upload');
const { Op, fn, col, literal } = require('sequelize');
const { Notification } = require('../models');
const { getMenuDietFields } = require('../utils/menuFoodType');

exports.saveRestaurantToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = await User.findByPk(userId);
    user.fcmToken = token;
    await user.save();

    res.json({
      success: true,
      message: 'FCM token saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get restaurant profile
// @route   GET /api/restaurant/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const restaurant = await getOrCreateRestaurant(userId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reload with schedules
    const restaurantWithSchedules = await Restaurant.findByPk(restaurant.id, {
      include: [
        {
          model: Schedule,
          as: 'schedules',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: { restaurant: restaurantWithSchedules }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update restaurant profile
// @route   PUT /api/restaurant/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = { ...req.body };

    // Get or create restaurant if it doesn't exist
    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle uploaded image
    if (req.file) {
      // Delete old image if exists
      if (restaurant.imageUrl) {
        const oldFilename = extractFilename(restaurant.imageUrl);
        if (oldFilename) {
          deleteImageFile(`uploads/restaurants/${oldFilename}`);
        }
      }
      // Set new image URL
      updateData.imageUrl = getImageUrl(req, req.file.filename, 'restaurant');
    }

    await restaurant.update(updateData);

    res.json({
      success: true,
      message: 'Restaurant profile updated successfully',
      data: { restaurant }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== MENU MANAGEMENT ====================

// @desc    Get all menu items
// @route   GET /api/restaurant/menu
// @access  Private
exports.getMenuItems = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let menus;

    // ✅ If Admin → Get all menu items
    if (userRole === 'admin') {
      menus = await Menu.findAll({
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['id', 'name']
          }
        ],
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
    }

    // ✅ If Restaurant Owner → Get only their menu
    else {
      const restaurant = await getOrCreateRestaurant(userId);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      menus = await Menu.findAll({
        where: { restaurantId: restaurant.id },
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
    }

    res.json({
      success: true,
      count: menus.length,
      data: { menus }
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Get single menu item
// @route   GET /api/restaurant/menu/:id
// @access  Private
exports.getMenuItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    let menu;

    // ✅ Admin → Can access any menu item
    if (userRole === 'admin') {
      menu = await Menu.findByPk(id);
    }

    // ✅ Restaurant Owner → Only their own menu item
    else {
      const restaurant = await getOrCreateRestaurant(userId);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      menu = await Menu.findOne({
        where: {
          id,
          restaurantId: restaurant.id
        }
      });
    }

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: { menu }
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Create menu item
// @route   POST /api/restaurant/menu
// @access  Private
exports.createMenuItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { name, description, price, category, isAvailable, foodType, isVeg, preparationTime } = req.body;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle uploaded image
    let imageUrl = null;
    if (req.file) {
      imageUrl = getImageUrl(req, req.file.filename, 'menu');
    }

    const dietFields = getMenuDietFields({ foodType, isVeg }, {}, { defaultToVeg: true });

    const menu = await Menu.create({
      restaurantId: restaurant.id,
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      ...dietFields,
      preparationTime
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: { menu }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update menu item
// @route   PUT /api/restaurant/menu/:id
// @access  Private
exports.updateMenuItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const updateData = { ...req.body };

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const menu = await Menu.findOne({
      where: {
        id,
        restaurantId: restaurant.id
      }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const dietFields = getMenuDietFields(
      { foodType: req.body.foodType, isVeg: req.body.isVeg },
      { foodType: menu.foodType, isVeg: menu.isVeg }
    );

    if (dietFields) {
      Object.assign(updateData, dietFields);
    }

    // Handle uploaded image
    if (req.file) {
      // Delete old image if exists
      if (menu.imageUrl) {
        const oldFilename = extractFilename(menu.imageUrl);
        if (oldFilename) {
          deleteImageFile(`uploads/menus/${oldFilename}`);
        }
      }
      // Set new image URL
      updateData.imageUrl = getImageUrl(req, req.file.filename, 'menu');
    }

    await menu.update(updateData);

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menu }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete menu item
// @route   DELETE /api/restaurant/menu/:id
// @access  Private
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const menu = await Menu.findOne({
      where: {
        id,
        restaurantId: restaurant.id
      }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await menu.destroy();

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SCHEDULE MANAGEMENT ====================

// @desc    Get restaurant schedule
// @route   GET /api/restaurant/schedule
// @access  Private
exports.getSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const schedules = await Schedule.findAll({
      where: { restaurantId: restaurant.id },
      order: [
        [sequelize.literal("FIELD(dayOfWeek, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')")]
      ]
    });

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update restaurant schedule
// @route   PUT /api/restaurant/schedule
// @access  Private
exports.updateSchedule = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { schedules } = req.body;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete existing schedules
    await Schedule.destroy({ where: { restaurantId: restaurant.id } });

    // Create new schedules
    const newSchedules = await Schedule.bulkCreate(
      schedules.map(schedule => ({
        ...schedule,
        restaurantId: restaurant.id
      }))
    );

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedules: newSchedules }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== OFFERS MANAGEMENT ====================

// @desc    Get all offers
// @route   GET /api/restaurant/offers
// @access  Private
exports.getOffers = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const offers = await Offer.findAll({
      where: { restaurantId: restaurant.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: offers.length,
      data: { offers }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create offer
// @route   POST /api/restaurant/offers
// @access  Private
exports.createOffer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const offerData = req.body;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const imageUrl = req.file
      ? getImageUrl(req, req.file.filename, 'offer')
      : null;

    if (imageUrl) {
      offerData.image = imageUrl;
    }

    const offer = await Offer.create({
      ...offerData,
      restaurantId: restaurant.id
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { offer }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer
// @route   PUT /api/restaurant/offers/:id
// @access  Private
exports.updateOffer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const offer = await Offer.findOne({
      where: {
        id,
        restaurantId: restaurant.id
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    await offer.update(updateData);

    res.json({
      success: true,
      message: 'Offer updated successfully',
      data: { offer }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete offer
// @route   DELETE /api/restaurant/offers/:id
// @access  Private
exports.deleteOffer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const offer = await Offer.findOne({
      where: {
        id,
        restaurantId: restaurant.id
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    await offer.destroy();

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getRestaurantStatistics = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ where: { ownerId: req.user.id } });
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    const restaurantId = restaurant.id;
    const { range, startDate, endDate } = req.query;

    let dateFilter = {};

    const now = new Date();

    if (range === 'today') {
      dateFilter = {
        createdAt: {
          [Op.gte]: new Date(now.setHours(0, 0, 0, 0))
        }
      };
    }

    if (range === 'week') {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      dateFilter = {
        createdAt: { [Op.gte]: weekStart }
      };
    }

    if (range === 'month') {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);
      dateFilter = {
        createdAt: { [Op.gte]: monthStart }
      };
    }

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }

    const whereClause = {
      restaurantId,
      ...dateFilter
    };

    // -------- Summary ----------
    const totalOrders = await Order.count({ where: whereClause });

    const completedOrders = await Order.count({
      where: { ...whereClause, status: 'delivered' }
    });

    const cancelledOrders = await Order.count({
      where: { ...whereClause, status: 'cancelled' }
    });

    const rejectedOrders = await Order.count({
      where: { ...whereClause, status: 'rejected' }
    });

    const revenueResult = await Order.findOne({
      where: { ...whereClause, status: 'delivered' },
      attributes: [[fn('SUM', col('total')), 'totalRevenue']]
    });

    const totalRevenue = revenueResult?.dataValues?.totalRevenue || 0;
    const commissionRate = 0.20; // 20% example
    const netEarnings = totalRevenue - totalRevenue * commissionRate;
    const avgOrderValue =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // -------- Revenue Trend ----------
    const revenueTrend = await Order.findAll({
      where: { ...whereClause, status: 'delivered' },
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('SUM', col('total')), 'revenue']
      ],
      group: [literal('DATE(createdAt)')],
      order: [[literal('DATE(createdAt)'), 'ASC']]
    });

    // -------- Top Items ----------
    const topItems = await OrderItem.findAll({
      attributes: [
        'menuId',
        [fn('SUM', col('quantity')), 'totalSold']
      ],
      where: {
        ...dateFilter,
      },
      include: [
        {
          model: Menu,
          as: 'menu',
          attributes: ['name'],
          where: { restaurantId }
        }
      ],
      group: ['menuId', 'menu.id'],
      order: [[literal('totalSold'), 'DESC']],
      limit: 5
    });

    return res.json({
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        rejectedOrders,
        totalRevenue,
        netEarnings,
        avgOrderValue
      },
      revenueTrend,
      topItems
    });
  } catch (error) {
    next(error);
  }
};
