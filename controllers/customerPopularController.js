const { Menu, Restaurant } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');
const { getResolvedFoodType, foodTypeToLegacyIsVeg } = require('../utils/menuFoodType');

/**
 * @desc    Get popular items
 * @route   GET /api/customer/items/popular
 * @access  Public (optional auth)
 */
exports.getPopularItems = async (req, res, next) => {
  try {
    const { limit = 20, restaurantId } = req.query;

    const whereClause = {
      isAvailable: true,
      totalSold: { [Op.gt]: 0 }
    };

    if (restaurantId) {
      whereClause.restaurantId = parseInt(restaurantId);
    }

    const menuItems = await Menu.findAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name']
        }
      ],
      order: [['totalSold', 'DESC']],
      limit: parseInt(limit)
    });

    const items = menuItems.map(item => {
      const rating = '4.5'; // Could calculate from reviews
      const isFeatured = item.totalSold > 100;
      const foodType = getResolvedFoodType(item.foodType, item.isVeg) || 'veg';

      return {
        id: item.id.toString(),
        name: item.name,
        price: `₹${parseFloat(item.price).toFixed(2)}`,
        originalPrice: null, // Could add discount price
        rating: rating,
        tag: isFeatured ? 'Popular' : 'Trending',
        icon: 'star',
        image: item.imageUrl ? getImageUrl(item.imageUrl, 'menu') : null,
        foodType,
        isVeg: foodTypeToLegacyIsVeg(foodType),
        isFeatured,
        soldCount: `${item.totalSold}+`,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurant?.name || 'Unknown'
      };
    });

    res.json({
      success: true,
      data: {
        items
      }
    });
  } catch (error) {
    next(error);
  }
};
