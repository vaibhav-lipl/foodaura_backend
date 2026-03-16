const { Menu, Restaurant, Review } = require('../models');
const { getImageUrl } = require('../middleware/upload');
const { getResolvedFoodType, foodTypeToLegacyIsVeg } = require('../utils/menuFoodType');

/**
 * @desc    Get restaurant menu
 * @route   GET /api/customer/restaurants/:restaurantId/menu
 * @access  Public (optional auth)
 */
exports.getRestaurantMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { category } = req.query;

    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    const whereClause = {
      restaurantId,
      isAvailable: true
    };

    if (category) {
      whereClause.category = category;
    }

    const menuItems = await Menu.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Get unique categories
    const categories = [...new Set(menuItems.map(item => item.category))];

    // Format menu items
    const formattedItems = menuItems.map(item => ({
      foodType: getResolvedFoodType(item.foodType, item.isVeg) || 'veg',
      id: item.id,
      name: item.name,
      description: item.description,
      price: `₹${parseFloat(item.price).toFixed(2)}`,
      image: item.imageUrl ? getImageUrl(item.imageUrl, 'menu') : null,
      category: item.category,
      isVeg: foodTypeToLegacyIsVeg(getResolvedFoodType(item.foodType, item.isVeg) || 'veg'),
      isAvailable: item.isAvailable,
      rating: '4.5', // Could calculate from reviews
      preparationTime: item.preparationTime ? `${item.preparationTime} min` : null
    }));

    res.json({
      success: true,
      data: {
        menuItems: formattedItems,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get menu item details
 * @route   GET /api/customer/menu-items/:menuItemId
 * @access  Public (optional auth)
 */
exports.getMenuItemDetails = async (req, res, next) => {
  try {
    const { menuItemId } = req.params;

    const menuItem = await Menu.findByPk(menuItemId, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          required: false
        }
      ]
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Get reviews for this item (if reviews are linked to menu items)
    // For now, return basic info

    res.json({
      success: true,
      data: {
        foodType: getResolvedFoodType(menuItem.foodType, menuItem.isVeg) || 'veg',
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        price: `₹${parseFloat(menuItem.price).toFixed(2)}`,
        image: menuItem.imageUrl ? getImageUrl(menuItem.imageUrl, 'menu') : null,
        category: menuItem.category,
        isVeg: foodTypeToLegacyIsVeg(getResolvedFoodType(menuItem.foodType, menuItem.isVeg) || 'veg'),
        isAvailable: menuItem.isAvailable,
        rating: '4.5',
        preparationTime: menuItem.preparationTime ? `${menuItem.preparationTime} min` : null,
        ingredients: [], // Could be added to Menu model
        allergens: [], // Could be added to Menu model
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
