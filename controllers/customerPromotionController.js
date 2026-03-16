const { Offer, Restaurant } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');

/**
 * @desc    Get promotions
 * @route   GET /api/customer/promotions
 * @access  Public (optional auth)
 */
exports.getPromotions = async (req, res, next) => {
  try {
    const { active, restaurantId } = req.query;

    const whereClause = {};

    if (active === 'true') {
      whereClause.isActive = true;
      whereClause.startDate = { [Op.lte]: new Date() };
      whereClause.endDate = { [Op.gte]: new Date() };
    }

    if (restaurantId) {
      whereClause.restaurantId = parseInt(restaurantId);
    }

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'imageUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const promotions = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      imageSmall: offer.image ? getImageUrl(offer.image, 'offer') : null,
      imageLarge: offer.image ? getImageUrl(offer.image, 'offer') : null,
      discount: parseFloat(offer.discountValue),
      discountType: offer.discountType,
      minOrderAmount: parseFloat(offer.minOrderAmount),
      maxDiscount: parseFloat(offer.maxDiscount),
      validFrom: offer.startDate.toISOString(),
      validUntil: offer.endDate.toISOString(),
      isActive: offer.isActive && 
                new Date() >= offer.startDate && 
                new Date() <= offer.endDate,
      restaurantId: offer.restaurantId,
      restaurantName: offer.restaurant?.name,
      code: offer.code
    }));

    res.json({
      success: true,
      data: {
        promotions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active promotions
 * @route   GET /api/customer/promotions/active
 * @access  Public (optional auth)
 */
exports.getActivePromotions = async (req, res, next) => {
  try {
    req.query.active = 'true';
    return exports.getPromotions(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate promo code
 * @route   POST /api/customer/promotions/validate
 * @access  Private
 */
exports.validatePromoCode = async (req, res, next) => {
  try {
    const { promoCode, orderTotal } = req.body;

    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    const offer = await Offer.findOne({
      where: {
        code: promoCode,
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });

    if (!offer) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          message: 'Invalid or expired promo code'
        }
      });
    }

    // Check minimum order amount
    if (orderTotal && parseFloat(orderTotal) < parseFloat(offer.minOrderAmount || 0)) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          message: `Minimum order amount of ₹${offer.minOrderAmount} required`
        }
      });
    }

    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = parseFloat(orderTotal || 0) * (parseFloat(offer.discountValue) / 100);
      if (offer.maxDiscount) {
        discount = Math.min(discount, parseFloat(offer.maxDiscount));
      }
    } else {
      discount = parseFloat(offer.discountValue);
    }

    res.json({
      success: true,
      data: {
        isValid: true,
        discount: parseFloat(discount.toFixed(2)),
        discountType: offer.discountType,
        message: `You'll save ₹${discount.toFixed(2)}`
      }
    });
  } catch (error) {
    next(error);
  }
};

