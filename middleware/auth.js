const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Access denied.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user is inactive.'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message
    });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Normalize role: treat 'restaurant_owner' as 'restaurant' for backward compatibility
      let userRole = req.user.role;
      if (userRole === 'restaurant_owner') {
        userRole = 'restaurant';
      }

      // Check if normalized role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization error.',
        error: error.message
      });
    }
  };
};

// Convenience middleware for specific roles
const isAdmin = authorize('admin');
const isRestaurant = authorize('restaurant', 'admin');
const isDeliveryPartner = authorize('delivery_partner', 'admin');
const isCustomer = authorize('customer', 'admin');

// Legacy middleware for backward compatibility
const isRestaurantOwner = authorize('restaurant', 'admin');

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isRestaurant,
  isDeliveryPartner,
  isCustomer,
  isRestaurantOwner // Keep for backward compatibility
};

