const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'restaurants',
      key: 'id'
    },
    comment: 'Restaurant ID for the items in cart'
  }
}, {
  tableName: 'carts',
  timestamps: true
});

module.exports = Cart;

