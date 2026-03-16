const { DeliveryPartnerRating, Order, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get Ratings and Reviews
 * @route   GET /api/captain/ratings
 * @access  Private
 */
exports.getRatings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ratings } = await DeliveryPartnerRating.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['orderNumber']
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate rating statistics
    const allRatings = await DeliveryPartnerRating.findAll({
      where: { userId }
    });

    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    const ratingDistribution = {
      5: allRatings.filter(r => r.rating === 5).length,
      4: allRatings.filter(r => r.rating === 4).length,
      3: allRatings.filter(r => r.rating === 3).length,
      2: allRatings.filter(r => r.rating === 2).length,
      1: allRatings.filter(r => r.rating === 1).length
    };

    const reviews = ratings.map(rating => ({
      id: rating.id,
      orderId: rating.order?.orderNumber || `ORD-${rating.orderId}`,
      customerName: rating.customer?.name || 'Anonymous',
      rating: rating.rating,
      comment: rating.comment,
      date: rating.createdAt
    }));

    res.json({
      success: true,
      ratings: {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalRatings,
        ratingDistribution
      },
      reviews: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

