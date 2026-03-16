const jwt = require('jsonwebtoken');
const { User, Restaurant } = require('../models');
const { validationResult } = require('express-validator');
const { getOrCreateRestaurant } = require('../utils/restaurantHelper');
const { getImageUrl } = require('../middleware/upload');
const { Notification } = require('../models');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register restaurant owner
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user (Step 1: User details only)
    // Default role is 'restaurant' for signup endpoint (restaurant owners)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'restaurant'
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please complete restaurant setup.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token,
        requiresRestaurantSetup: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login restaurant owner
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with restaurant
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        required: false
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Ensure restaurant exists (only for restaurant role users)
    // Also handle 'restaurant_owner' for backward compatibility
    let restaurant = null;
    if (user.role === 'restaurant' || user.role === 'restaurant_owner') {
      restaurant = await getOrCreateRestaurant(user.id);
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          restaurant: restaurant || null
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Setup restaurant (Step 2 of signup)
// @route   POST /api/auth/setup-restaurant
// @access  Private
exports.setupRestaurant = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;

    // Check if restaurant already exists
    const existingRestaurant = await Restaurant.findOne({ where: { ownerId: userId } });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant already exists. Use update profile endpoint to modify.'
      });
    }

    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      cuisineType
    } = req.body;

    // Handle uploaded image
    let imageUrl = null;
    if (req.file) {
      imageUrl = getImageUrl(req, req.file.filename, 'restaurant');
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      ownerId: userId,
      name,
      description,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      cuisineType,
      imageUrl,
      isOpen: false
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant setup completed successfully',
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          isOpen: restaurant.isOpen
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        required: false
      }]
    });

    res.json({
      success: true,
      data: {
        user,
        requiresRestaurantSetup: !user.restaurant
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });  
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });  
  } catch (error) {
    next(error);
  }
};

