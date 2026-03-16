const { User, Order, Favorite } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * @desc    Get user profile
 * @route   GET /api/customer/users/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user stats
    const ordersCount = await Order.count({
      where: { userId: req.user.id }
    });

    const favoritesCount = await Favorite.count({
      where: { userId: req.user.id }
    });

    // Get average rating from reviews
    const { Review } = require('../models');
    const reviews = await Review.findAll({
      where: { userId: req.user.id },
      attributes: ['rating']
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0) / reviews.length
      : 0;

    // Generate initials
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone,
        initials,
        profileImage: user.profileImage || null,
        stats: {
          orders: ordersCount,
          favorites: favoritesCount,
          rating: Math.round(avgRating * 10) / 10
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/customer/users/profile
 * @access  Private
 */
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

    const { name, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

    if (email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updateData.email = email;
    }
    console.log(req.file);
    // ✅ Handle uploaded image
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.profileImage = `${baseUrl}/uploads/profile-images/${req.file.filename}`;
    }

    await User.update(updateData, {
      where: { id: req.user.id }
    });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phone,
        profileImage: updatedUser.profileImage
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Delete/Deactivate account
 * @route   DELETE /api/customer/users/profile
 * @access  Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const { reason, password } = req.body;

    // If password is required, verify it
    if (password) {
      const user = await User.findByPk(req.user.id);
      if (user.password) {
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid password'
          });
        }
      }
    }

    // Deactivate account instead of deleting
    await User.update(
      { isActive: false },
      { where: { id: req.user.id } }
    );

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

