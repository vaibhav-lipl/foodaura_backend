const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cartId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'carts',
      key: 'id'
    }
  },
  menuItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'menus',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Price at time of adding to cart'
  },
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'cart_items',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['cartId', 'menuItemId'],
      name: 'unique_cart_item'
    }
  ]
});

module.exports = CartItem;

