const { User, Restaurant, Order, Menu, Review, DeliveryPartnerProfile,
  DeliveryPartnerVehicle,
  DeliveryPartnerDocument,
  DeliveryPartnerEarning,
  DeliveryPartnerPayout,
  DeliveryPartnerPayoutMethod,
  DeliveryPartnerSchedule,
  DeliveryPartnerLocation,
  DeliveryPartnerRating, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sanitizeString, sanitizeBoolean, sanitizeNumber } = require('../utils/queryHelper');
const bcrypt = require('bcryptjs');
const Admin = require('../models/User'); // Assuming Admin is a type of User

const getDocumentUrl = (req, filename) => {
  if (!filename) return null;
  const baseUrl = req.protocol + '://' + req.get('host');
  const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;
  console.log('Generating document URL:', `${baseUrl}/uploads/documents/${justFilename}`);
  return `${baseUrl}/uploads/documents/${justFilename}`;
};


// ===============================
// UPDATE ADMIN PROFILE
// ===============================
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.user.id; // from auth middleware
    const { name, phone } = req.body;

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    admin.name = name ?? admin.name;
    admin.phone = phone ?? admin.phone;

    await admin.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

// ===============================
// CHANGE ADMIN PASSWORD
// ===============================
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    admin.password = newPassword;

    await admin.save();

    return res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};


/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Get total counts
    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalMenus,
      totalReviews
    ] = await Promise.all([
      User.count(),
      Restaurant.count(),
      Order.count(),
      Menu.count(),
      Review.count()
    ]);

    // Get active counts
    const [
      activeUsers,
      activeRestaurants,
      openRestaurants
    ] = await Promise.all([
      User.count({ where: { isActive: true } }),
      Restaurant.count({ where: { isActive: true } }),
      Restaurant.count({ where: { isOpen: true } })
    ]);

    // Get users by role
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    // Get recent orders (last 10)
    const recentOrders = await Order.findAll({
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      todayRevenue
    ] = await Promise.all([
      Order.count({
        where: {
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      }),
      Order.sum('total', {
        where: {
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          },
          status: { [Op.ne]: 'cancelled' }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalRestaurants,
          totalOrders,
          totalMenus,
          totalReviews,
          activeUsers,
          activeRestaurants,
          openRestaurants
        },
        today: {
          orders: todayOrders,
          revenue: parseFloat(todayRevenue || 0).toFixed(2)
        },
        usersByRole: usersByRole.map(item => ({
          role: item.role,
          count: parseInt(item.get('count'))
        })),
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Sanitize and validate query parameters
    const role = sanitizeString(req.query.role);
    const isActive = sanitizeBoolean(req.query.isActive);
    const search = sanitizeString(req.query.search);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 20);

    const whereClause = {};

    // Only add role filter if it's a valid value
    if (role !== null) {
      whereClause.role = role;
    }

    // Only add isActive filter if it's a valid boolean
    if (isActive !== null) {
      whereClause.isActive = isActive;
    }

    // Only add search if it's a valid string
    if (search !== null) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      success: true,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role or deactivating themselves
    if (req.user.id === parseInt(id)) {
      delete updateData.role;
      delete updateData.isActive;
    }

    await user.update(updateData);

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all restaurants
 * @route   GET /api/admin/restaurants
 * @access  Private (Admin only)
 */
exports.getRestaurants = async (req, res, next) => {
  try {
    // Sanitize and validate query parameters
    const isActive = sanitizeBoolean(req.query.isActive);
    const isOpen = sanitizeBoolean(req.query.isOpen);
    const search = sanitizeString(req.query.search);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 20);

    const whereClause = {};

    // Only add filters if they have valid values
    if (isActive !== null) {
      whereClause.isActive = isActive;
    }

    if (isOpen !== null) {
      whereClause.isOpen = isOpen;
    }

    if (search !== null) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { cuisineType: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      success: true,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      data: { restaurants }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update restaurant status
 * @route   PUT /api/admin/restaurants/:id/status
 * @access  Private (Admin only)
 */
exports.updateRestaurantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    restaurant.isActive = isActive !== undefined ? isActive : restaurant.isActive;
    await restaurant.save();

    res.json({
      success: true,
      message: 'Restaurant status updated successfully',
      data: { restaurant }
    });
  } catch (error) {
    next(error);
  }
};


exports.getDeliveryPartners = async (req, res, next) => {
  try {
    const isActive = sanitizeString(req.query.isActive);
    const isOpen = sanitizeBoolean(req.query.isOpen);
    const search = sanitizeString(req.query.search);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 20);

    const whereClause = {};

    // Only add filters if they have valid values
    if (isActive !== null) {
      whereClause.status = isActive;
    }

    if (search !== null) {
      whereClause[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: deliveryPartners } = await DeliveryPartnerProfile.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      success: true,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      data: { deliveryPartners }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDeliveryPartnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // expected: active | inactive | suspended

    const allowedStatuses = ['active', 'inactive', 'suspended'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const deliveryPartner = await DeliveryPartnerProfile.findByPk(id);

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Partner not found'
      });
    }

    deliveryPartner.status = status;
    await deliveryPartner.save();

    res.json({
      success: true,
      message: 'Delivery Partner status updated successfully',
      data: deliveryPartner
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Delivery Partner Full Details (Admin)
 * @route   GET /api/admin/delivery-partners/:userId
 * @access  Private (Admin only)
 */
exports.getDeliveryPartnerDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const deliveryPartner = await User.findOne({
      where: {
        id: userId,
        role: 'delivery_partner'
      },
      attributes: { exclude: ['password'] },
      include: [

        // Profile
        {
          model: DeliveryPartnerProfile,
          as: 'deliveryPartnerProfile'
        },

        // Vehicle
        {
          model: DeliveryPartnerVehicle,
          as: 'deliveryPartnerVehicle'
        },

        // Documents
        {
          model: DeliveryPartnerDocument,
          as: 'deliveryPartnerDocuments'
        },

        // Earnings with Order
        {
          model: DeliveryPartnerEarning,
          as: 'deliveryPartnerEarnings',
          include: [
            {
              model: Order,
              as: 'order'
            }
          ],
          order: [['createdAt', 'DESC']]
        },

        // Payouts with payout method
        {
          model: DeliveryPartnerPayout,
          as: 'deliveryPartnerPayouts',
          include: [
            {
              model: DeliveryPartnerPayoutMethod,
              as: 'payoutMethod'
            }
          ],
          order: [['createdAt', 'DESC']]
        },

        // Payout Methods
        {
          model: DeliveryPartnerPayoutMethod,
          as: 'deliveryPartnerPayoutMethods'
        },

        // Schedule
        {
          model: DeliveryPartnerSchedule,
          as: 'deliveryPartnerSchedules'
        },

        // Locations with Order
        {
          model: DeliveryPartnerLocation,
          as: 'deliveryPartnerLocations',
          include: [
            {
              model: Order,
              as: 'order'
            }
          ],
          order: [['createdAt', 'DESC']]
        },

        // Ratings (include customer + order)
        {
          model: DeliveryPartnerRating,
          as: 'deliveryPartnerRatings',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Order,
              as: 'order'
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Partner not found'
      });
    }

    const deliveryPartnerData = deliveryPartner.toJSON();

    deliveryPartnerData.deliveryPartnerDocuments =
      deliveryPartnerData.deliveryPartnerDocuments.map(doc => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        url: getDocumentUrl(req, doc.url),
        status: doc.status,
        uploadDate: doc.uploadDate,
        expiryDate: doc.expiryDate
      }));
      
      console.log('Fetched Delivery Partner Details:', deliveryPartner.deliveryPartnerDocuments);

    return res.json({
      success: true,
      data: deliveryPartnerData
    });



  } catch (error) {
    next(error);
  }
};



