const { Review, Restaurant, User, Order, DeliveryPartnerRating } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * @desc    Get restaurant reviews
 * @route   GET /api/customer/restaurants/:restaurantId/reviews
 * @access  Public (optional auth)
 */
exports.getRestaurantReviews = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 20, sortBy = 'recent' } = req.query;

    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    let orderBy = [['createdAt', 'DESC']];
    if (sortBy === 'highest') {
      orderBy = [['rating', 'DESC'], ['createdAt', 'DESC']];
    } else if (sortBy === 'lowest') {
      orderBy = [['rating', 'ASC'], ['createdAt', 'DESC']];
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { restaurantId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: orderBy,
      limit: parseInt(limit),
      offset
    });

    const formattedReviews = reviews.map(review => ({
      id: review.id,
      userId: review.userId,
      userName: review.user?.name || review.customerName || 'Anonymous',
      userImage: null, // Could add profile image to User model
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      orderId: review.orderId
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        },
        averageRating: parseFloat(restaurant.averageRating || 0).toFixed(1),
        totalReviews: restaurant.totalReviews || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit review
 * @route   POST /api/customer/reviews
 * @access  Private
 */
exports.submitReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId, restaurantId, rating, comment, itemRatings } = req.body;

    // Verify order belongs to user
    if (orderId) {
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId: req.user.id,
          restaurantId
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or does not belong to you'
        });
      }

      // Check if review already exists for this order
      const existingReview = await Review.findOne({
        where: { orderId, userId: req.user.id }
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Review already submitted for this order'
        });
      }
    }

    // Create review
    const review = await Review.create({
      userId: req.user.id,
      restaurantId,
      customerName: req.user.name,
      rating,
      comment,
      orderId
    });

    // Update restaurant average rating and total reviews
    const reviews = await Review.findAll({
      where: { restaurantId },
      attributes: ['rating']
    });

    const avgRating = reviews.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0) / reviews.length;

    await Restaurant.update(
      {
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalReviews: reviews.length
      },
      { where: { id: restaurantId } }
    );

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit delivery partner review
 * @route   POST /api/customer/delivery-partner-reviews
 * @access  Private
 */
exports.submitDeliveryPartnerReview = async (req, res, next) => {
  try {
    console.log('submitDeliveryPartnerReview called with body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId, rating, comment } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to you'
      });
    }

    if (!order.deliveryPartnerId) {
      return res.status(400).json({
        success: false,
        message: 'No delivery partner assigned for this order'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'You can review delivery partner only after delivery is completed'
      });
    }

    const existingRating = await DeliveryPartnerRating.findOne({
      where: {
        orderId,
        customerId: req.user.id
      }
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Delivery partner review already submitted for this order'
      });
    }

    const deliveryPartnerRating = await DeliveryPartnerRating.create({
      userId: order.deliveryPartnerId,
      orderId,
      customerId: req.user.id,
      rating,
      comment
    });

    return res.json({
      success: true,
      message: 'Delivery partner review submitted successfully',
      data: {
        review: {
          id: deliveryPartnerRating.id,
          orderId: deliveryPartnerRating.orderId,
          deliveryPartnerId: deliveryPartnerRating.userId,
          customerId: deliveryPartnerRating.customerId,
          rating: deliveryPartnerRating.rating,
          comment: deliveryPartnerRating.comment,
          createdAt: deliveryPartnerRating.createdAt.toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
