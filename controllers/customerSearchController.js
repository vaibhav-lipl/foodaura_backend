const { Restaurant, Menu } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');
const {
  getResolvedFoodType,
  foodTypeToLegacyIsVeg,
  getRestaurantFoodTypesFromMenus
} = require('../utils/menuFoodType');

/**
 * @desc    Global search
 * @route   GET /api/customer/search
 * @access  Public (optional auth)
 */
exports.globalSearch = async (req, res, next) => {
  try {
    const {
      query: searchQuery,
      type = 'all', // 'restaurants', 'dishes', or 'all'
      page = 1,
      limit = 20,
      cuisine,
      isVeg,
      latitude,
      longitude
    } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const results = {
      restaurants: [],
      dishes: []
    };

    // Search restaurants
    if (type === 'all' || type === 'restaurants') {
      const restaurantWhere = {
        isActive: true,
        [Op.or]: [
          { name: { [Op.like]: `%${searchQuery}%` } },
          { cuisineType: { [Op.like]: `%${searchQuery}%` } },
          { description: { [Op.like]: `%${searchQuery}%` } },
          { '$menus.name$': { [Op.like]: `%${searchQuery}%` } }
        ]
      };

      if (cuisine) {
        restaurantWhere.cuisineType = { [Op.like]: `%${cuisine}%` };
      }

      const restaurants = await Restaurant.findAll({
        where: restaurantWhere,
        include: [
          {
            model: Menu,
            as: 'menus',
            attributes: ['foodType', 'isVeg'],
            where: { isAvailable: true },
            required: false // VERY IMPORTANT
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['averageRating', 'DESC']],
        subQuery: false
      });

      results.restaurants = restaurants.map(r => {
        const menus = r.menus || [];

        let vegStatus = false; // default: all non-veg

        if (menus.length > 0) {
          const vegCount = menus.filter((m) => {
            const foodType = getResolvedFoodType(m.foodType, m.isVeg);
            return foodType && foodType !== 'nonVeg';
          }).length;
          const nonVegCount = menus.filter((m) => {
            const foodType = getResolvedFoodType(m.foodType, m.isVeg);
            return foodType === 'nonVeg';
          }).length;

          if (vegCount > 0 && nonVegCount > 0) {
            vegStatus = 'both';
          } else if (vegCount > 0 && nonVegCount === 0) {
            vegStatus = true;
          } else {
            vegStatus = false;
          }
        }

        return {
          id: r.id,
          name: r.name,
          cuisine: r.cuisineType || 'General',
          rating: parseFloat(r.averageRating || 0).toFixed(1),
          deliveryTime: '30-45 min',
          distance: '2.5 km',
          restaurantImage: r.imageUrl
            ? getImageUrl(r.imageUrl, 'restaurant')
            : null,
          isVeg: vegStatus, // ✅ true | false | "both"
          restaurantFoodTypes: getRestaurantFoodTypesFromMenus(menus),
          averagePrice: '₹500',
          location: `${r.city}, ${r.state || ''}`
        };
      });


    }

    // Search dishes/menu items
    if (type === 'all' || type === 'dishes') {
      const menuWhere = {
        isAvailable: true,
        [Op.or]: [
          { name: { [Op.like]: `%${searchQuery}%` } },
          { description: { [Op.like]: `%${searchQuery}%` } },
          { category: { [Op.like]: `%${searchQuery}%` } }
        ]
      };

      if (isVeg === 'true') {
        menuWhere.foodType = { [Op.in]: ['veg', 'jain'] };
      }

      const menuItems = await Menu.findAll({
        where: menuWhere,
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['id', 'name', 'imageUrl']
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['totalSold', 'DESC']]
      });

      results.dishes = menuItems.map(m => {
        const foodType = getResolvedFoodType(m.foodType, m.isVeg) || 'veg';

        return {
          id: m.id,
        name: m.name,
        description: m.description,
        price: `₹${parseFloat(m.price).toFixed(2)}`,
        image: m.imageUrl ? getImageUrl(m.imageUrl, 'menu') : null,
        category: m.category,
        foodType,
        isVeg: foodTypeToLegacyIsVeg(foodType),
        restaurantId: m.restaurantId,
        restaurantName: m.restaurant?.name || 'Unknown'
        };
      });
    }

    const totalResults = results.restaurants.length + results.dishes.length;

    res.json({
      success: true,
      data: {
        restaurants: results.restaurants,
        dishes: results.dishes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResults,
          totalPages: Math.ceil(totalResults / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search suggestions
 * @route   GET /api/customer/search/suggestions
 * @access  Public (optional auth)
 */
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { query: searchQuery, limit = 10 } = req.query;

    if (!searchQuery || searchQuery.length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    const suggestions = [];

    // Get restaurant suggestions
    const restaurants = await Restaurant.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.like]: `%${searchQuery}%` } },
          { '$menus.name$': { [Op.like]: `%${searchQuery}%` } }
        ]
      },
      include: [
        {
          model: Menu,
          as: 'menus',
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${searchQuery}%` } }
            ]
          },
          attributes: ['id', 'name', 'foodType', 'isVeg', 'imageUrl'],
          required: false
        }
      ],
      limit: 5,
      attributes: ['id', 'name', 'imageUrl'],
      distinct: true,
      subQuery: false
    });

    restaurants.forEach(r => {
      suggestions.push({
        type: 'restaurant',
        text: r.name,
        image: r.imageUrl ? getImageUrl(r.imageUrl, 'restaurant') : null,
        id: r.id.toString(),
        dishes: r.menus
      });
    });

    // Get menu item suggestions
    // const menuItems = await Menu.findAll({
    //   where: {
    //     isAvailable: true,
    //     name: { [Op.like]: `%${searchQuery}%` }
    //   },
    //   limit: 5,
    //   attributes: ['id', 'name']
    // });

    // menuItems.forEach(m => {
    //   suggestions.push({
    //     type: 'dish',
    //     text: m.name,
    //     id: m.id.toString()
    //   });
    // });

    res.json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};
