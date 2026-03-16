const { Favorite, Restaurant, Menu } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');

/**
 * @desc    Get favorites
 * @route   GET /api/customer/favorites
 * @access  Private
 */
exports.getFavorites = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const whereClause = { userId: req.user.id };
    if (type && ['Restaurant', 'Dish'].includes(type)) {
      whereClause.type = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: favorites } = await Favorite.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          required: false,
          attributes: ['id', 'name', 'imageUrl', 'averageRating']
        },
        {
          model: Menu,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const formattedFavorites = favorites.map(fav => {
      if (fav.type === 'Restaurant' && fav.restaurant) {
        return {
          id: fav.id,
          type: 'Restaurant',
          name: fav.restaurant.name,
          image: fav.restaurant.imageUrl ? getImageUrl(fav.restaurant.imageUrl, 'restaurant') : null,
          rating: parseFloat(fav.restaurant.averageRating || 0).toFixed(1),
          restaurantId: fav.restaurant.id,
          menuItemId: null
        };
      } else if (fav.type === 'Dish' && fav.menuItem) {
        return {
          id: fav.id,
          type: 'Dish',
          name: fav.menuItem.name,
          image: fav.menuItem.imageUrl ? getImageUrl(fav.menuItem.imageUrl, 'menu') : null,
          price: `₹${parseFloat(fav.menuItem.price).toFixed(2)}`,
          restaurantId: fav.menuItem.restaurantId,
          restaurantName: fav.menuItem.restaurant?.name,
          menuItemId: fav.menuItem.id
        };
      }
      return null;
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        favorites: formattedFavorites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add to favorites
 * @route   POST /api/customer/favorites
 * @access  Private
 */
exports.addFavorite = async (req, res, next) => {
  try {
    const { type, restaurantId, menuItemId } = req.body;

    if (!type || !['Restaurant', 'Dish'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid favorite type. Must be Restaurant or Dish'
      });
    }

    if (type === 'Restaurant' && !restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId is required for Restaurant type'
      });
    }

    if (type === 'Dish' && !menuItemId) {
      return res.status(400).json({
        success: false,
        message: 'menuItemId is required for Dish type'
      });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      where: {
        userId: req.user.id,
        type,
        restaurantId: type === 'Restaurant' ? restaurantId : null,
        menuItemId: type === 'Dish' ? menuItemId : null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already in favorites'
      });
    }

    // Validate restaurant or menu item exists
    if (type === 'Restaurant') {
      const restaurant = await Restaurant.findByPk(restaurantId);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }
    } else {
      const menuItem = await Menu.findByPk(menuItemId, {
        include: [{ model: Restaurant, as: 'restaurant' }]
      });
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }
      // Set restaurantId from menu item
      restaurantId = menuItem.restaurantId;
    }

    const favorite = await Favorite.create({
      userId: req.user.id,
      type,
      restaurantId,
      menuItemId: type === 'Dish' ? menuItemId : null
    });

    res.json({
      success: true,
      message: 'Added to favorites',
      data: {
        favorite: {
          id: favorite.id,
          type: favorite.type
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove from favorites
 * @route   DELETE /api/customer/favorites/:favoriteId
 * @access  Private
 */
exports.removeFavorite = async (req, res, next) => {
  try {
    const { favoriteId } = req.params;

    const favorite = await Favorite.findOne({
      where: {
        id: favoriteId,
        userId: req.user.id
      }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    await favorite.destroy();

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if item is favorite
 * @route   GET /api/customer/favorites/check
 * @access  Private
 */
exports.checkFavorite = async (req, res, next) => {
  try {
    const { type, restaurantId, menuItemId } = req.query;

    if (!type || !['Restaurant', 'Dish'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid favorite type'
      });
    }

    const whereClause = {
      userId: req.user.id,
      type
    };

    if (type === 'Restaurant') {
      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required'
        });
      }
      whereClause.restaurantId = restaurantId;
    } else {
      if (!menuItemId) {
        return res.status(400).json({
          success: false,
          message: 'menuItemId is required'
        });
      }
      whereClause.menuItemId = menuItemId;
    }

    const favorite = await Favorite.findOne({ where: whereClause });

    res.json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favoriteId: favorite ? favorite.id : null
      }
    });
  } catch (error) {
    next(error);
  }
};

