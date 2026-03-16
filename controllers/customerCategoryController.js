const { Menu, Restaurant } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get categories
 * @route   GET /api/customer/categories
 * @access  Public (optional auth)
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { type } = req.query; // 'restaurant', 'menu', or both

    const categories = [];

    // Get restaurant categories (cuisine types)
    if (!type || type === 'restaurant' || type === 'both') {
      const restaurants = await Restaurant.findAll({
        where: {
          isActive: true,
          cuisineType: { [Op.ne]: null }
        },
        attributes: ['cuisineType'],
        group: ['cuisineType'],
        raw: true
      });

      const restaurantCategories = restaurants.map((r, index) => ({
        id: `restaurant_${index + 1}`,
        label: r.cuisineType,
        icon: 'restaurant',
        image: null,
        type: 'restaurant'
      }));

      categories.push(...restaurantCategories);
    }

    // Get menu categories
    if (!type || type === 'menu' || type === 'both') {
      const menuItems = await Menu.findAll({
        where: {
          isAvailable: true,
          category: { [Op.ne]: null }
        },
        attributes: ['category'],
        group: ['category'],
        raw: true
      });

      const menuCategories = menuItems.map((m, index) => ({
        id: `menu_${index + 1}`,
        label: m.category,
        icon: 'food',
        image: null,
        type: 'menu'
      }));

      categories.push(...menuCategories);
    }

    // Remove duplicates
    const uniqueCategories = categories.filter((cat, index, self) =>
      index === self.findIndex(c => c.label === cat.label && c.type === cat.type)
    );

    res.json({
      success: true,
      data: {
        categories: uniqueCategories
      }
    });
  } catch (error) {
    next(error);
  }
};

