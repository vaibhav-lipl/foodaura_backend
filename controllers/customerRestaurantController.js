const { Restaurant, Favorite, Review, Menu, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');
const {
  getRestaurantVegStatusFromMenus,
  getRestaurantFoodTypesFromMenus,
  normalizeRestaurantFoodTypeFilter
} = require('../utils/menuFoodType');

/**
 * @desc    Get restaurants list
 * @route   GET /api/customer/restaurants
 * @access  Public (optional auth)
 */
exports.getRestaurants = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      cuisine,
      foodType,
      isVeg,
      minRating,
      latitude,
      longitude,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {
      isActive: true
    };

    // Apply filters
    if (cuisine) {
      whereClause.cuisineType = { [Op.like]: `%${cuisine}%` };
    }

    if (minRating) {
      whereClause.averageRating = { [Op.gte]: parseFloat(minRating) };
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { cuisineType: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const normalizedFoodTypeFilter = normalizeRestaurantFoodTypeFilter(foodType);

    if (foodType && !normalizedFoodTypeFilter) {
      return res.status(400).json({
        success: false,
        message: 'foodType must be one of veg, non-veg, jain'
      });
    }

    const matchesRestaurantFoodTypeFilter = (restaurantFoodTypesList) => {
      if (normalizedFoodTypeFilter === 'jain') {
        return (
          !restaurantFoodTypesList.includes('non-veg') &&
          restaurantFoodTypesList.includes('jain')
        );
      }

      if (normalizedFoodTypeFilter) {
        return restaurantFoodTypesList.includes(normalizedFoodTypeFilter);
      }

      return true;
    };

    // Sort options
    let orderBy = [['averageRating', 'DESC']];
    switch (sortBy) {
      case 'rating':
        orderBy = [['averageRating', 'DESC']];
        break;
      case 'deliveryTime':
        // Assuming delivery time is fixed or calculated
        orderBy = [['createdAt', 'ASC']];
        break;
      case 'distance':
        // Distance calculation would require geospatial queries
        orderBy = [['createdAt', 'ASC']];
        break;
      case 'price':
        // Would need to join with menu items
        orderBy = [['createdAt', 'ASC']];
        break;
      default:
        orderBy = [['averageRating', 'DESC']];
    }

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: orderBy
    });

    // Get user favorites if authenticated
    let userFavorites = [];
    if (req.user) {
      const favorites = await Favorite.findAll({
        where: {
          userId: req.user.id,
          type: 'Restaurant'
        },
        attributes: ['restaurantId']
      });
      userFavorites = favorites.map(f => f.restaurantId);
    }

    // Format response
    const formattedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        // Get average price from menu items
        const menuItems = await Menu.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['price']
        });
        const avgPrice = menuItems.length > 0
          ? menuItems.reduce((sum, m) => sum + parseFloat(m.price || 0), 0) / menuItems.length
          : 0;

        const menuDietRows = await Menu.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['foodType', 'isVeg']
        });
        const vegType = getRestaurantVegStatusFromMenus(menuDietRows);
        const restaurantFoodTypes = getRestaurantFoodTypesFromMenus(menuDietRows);

        // Apply isVeg filter
        if (isVeg === 'true' && vegType !== true) {
          return null;
        }

        if (isVeg === 'false' && vegType !== false) {
          return null;
        }

        if (isVeg === 'both' && vegType !== 'both') {
          return null;
        }

        if (!matchesRestaurantFoodTypeFilter(restaurantFoodTypes)) {
          return null;
        }


        return {
          id: restaurant.id,
          name: restaurant.name,
          cuisine: restaurant.cuisineType || 'General',
          rating: parseFloat(restaurant.averageRating || 0).toFixed(1),
          deliveryTime: '30-45 min', // Default or calculate
          distance: '2.5 km', // Calculate from lat/lng
          images: restaurant.imageUrl ? [getImageUrl(restaurant.imageUrl, 'restaurant')] : [],
          foodImages: [], // Could be populated from menu items
          restaurantImage: restaurant.imageUrl ? getImageUrl(restaurant.imageUrl, 'restaurant') : null,
          isVeg: vegType, // ✅ true | false | "both"
          restaurantFoodTypes,
          averagePrice: `₹${Math.round(avgPrice)}`,
          location: `${restaurant.city}, ${restaurant.state || ''}`,
          isLiked: userFavorites.includes(restaurant.id)
        };
      })
    );

    // Filter out null values
    const filteredRestaurants = formattedRestaurants.filter(r => r !== null);

    res.json({
      success: true,
      data: {
        restaurants: filteredRestaurants,
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
 * @desc    Get restaurant details
 * @route   GET /api/customer/restaurants/:restaurantId
 * @access  Public (optional auth)
 */
exports.getRestaurantDetails = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findByPk(restaurantId, {
      include: [
        {
          model: Menu,
          as: 'menus',
          required: false,
          limit: 5,
          order: [['totalSold', 'DESC']]
        }
      ]
    });

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get reviews
    const reviews = await Review.findAll({
      where: { restaurantId: restaurant.id },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Get opening hours (from Schedule model)
    const { Schedule } = require('../models');
    const schedules = await Schedule.findAll({
      where: { restaurantId: restaurant.id }
    });

    const openingHours = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      const schedule = schedules.find(s => s.dayOfWeek.toLowerCase() === day);
      openingHours[day] = schedule
        ? `${schedule.openTime} - ${schedule.closeTime}`
        : 'Closed';
    });

    // Check if liked
    let isLiked = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId: restaurant.id,
          type: 'Restaurant'
        }
      });
      isLiked = !!favorite;
    }

    // Get average price
    const menuItems = await Menu.findAll({
      where: { restaurantId: restaurant.id },
      attributes: ['price']
    });
    const avgPrice = menuItems.length > 0
      ? menuItems.reduce((sum, m) => sum + parseFloat(m.price || 0), 0) / menuItems.length
      : 0;

    const menuDietRows = await Menu.findAll({
      where: { restaurantId: restaurant.id },
      attributes: ['foodType', 'isVeg']
    });
    const vegType = getRestaurantVegStatusFromMenus(menuDietRows);
    const restaurantFoodTypes = getRestaurantFoodTypesFromMenus(menuDietRows);

    res.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        cuisine: restaurant.cuisineType || 'General',
        rating: parseFloat(restaurant.averageRating || 0).toFixed(1),
        deliveryTime: '30-45 min',
        distance: '2.5 km',
        images: restaurant.imageUrl ? [getImageUrl(restaurant.imageUrl, 'restaurant')] : [],
        foodImages: menuItems.slice(0, 5).map(m => m.imageUrl ? getImageUrl(m.imageUrl, 'menu') : null).filter(Boolean),
        restaurantImage: restaurant.imageUrl ? getImageUrl(restaurant.imageUrl, 'restaurant') : null,
        isVeg: vegType, // ✅ true | false | "both"
        restaurantFoodTypes,
        averagePrice: `₹${Math.round(avgPrice)}`,
        location: `${restaurant.address}, ${restaurant.city}`,
        description: restaurant.description,
        isLiked,
        reviewsCount: restaurant.totalReviews || 0,
        openingHours
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search restaurants
 * @route   GET /api/customer/restaurants/search
 * @access  Public (optional auth)
 */
exports.searchRestaurants = async (req, res, next) => {
  try {
    const {
      query: searchQuery,
      foodType
    } = req.query;

    if (searchQuery) {
      req.query.search = searchQuery;
    }

    if (foodType) {
      req.query.foodType = foodType;
    }

    return exports.getRestaurants(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Like/Unlike restaurant
 * @route   POST /api/customer/restaurants/:restaurantId/like
 * @route   DELETE /api/customer/restaurants/:restaurantId/like
 * @access  Private
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Check if already liked
    const existingFavorite = await Favorite.findOne({
      where: {
        userId,
        restaurantId,
        type: 'Restaurant'
      }
    });

    if (existingFavorite) {
      // Unlike
      await existingFavorite.destroy();
      return res.json({
        success: true,
        message: 'Restaurant unliked successfully'
      });
    } else {
      // Like
      await Favorite.create({
        userId,
        restaurantId,
        type: 'Restaurant'
      });
      return res.json({
        success: true,
        message: 'Restaurant liked successfully',
        data: {
          isLiked: true
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
