const { Restaurant, User } = require('../models');

/**
 * Get or create restaurant for a user
 * This ensures every restaurant owner has a restaurant entry
 * @param {number} userId - The user ID
 * @returns {Promise<Restaurant|null>} - Restaurant instance or null if user doesn't exist
 */
const getOrCreateRestaurant = async (userId) => {
  let restaurant = await Restaurant.findOne({ where: { ownerId: userId } });
  
  if (!restaurant) {
    // Get user info to create restaurant with user's name
    const user = await User.findByPk(userId);
    if (!user) {
      return null;
    }
    
    // Only create restaurant if user has restaurant role
    // Also handle 'restaurant_owner' for backward compatibility
    if (user.role !== 'restaurant' && user.role !== 'restaurant_owner') {
      return null;
    }
    
    // Create restaurant with default values
    restaurant = await Restaurant.create({
      ownerId: userId,
      name: `${user.name}'s Restaurant`,
      description: 'Restaurant description',
      address: 'Address not set',
      city: 'City not set',
      phone: user.phone || '',
      email: user.email,
      isOpen: false
    });
  }
  
  return restaurant;
};

module.exports = { getOrCreateRestaurant };

