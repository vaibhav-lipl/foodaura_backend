const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('Restaurant', 'Dish'),
    allowNull: false
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'restaurants',
      key: 'id'
    },
    comment: 'Required for Restaurant type, optional for Dish type'
  },
  menuItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'menus',
      key: 'id'
    },
    comment: 'Required for Dish type'
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'type', 'restaurantId', 'menuItemId'],
      name: 'unique_favorite'
    }
  ]
});

module.exports = Favorite;

