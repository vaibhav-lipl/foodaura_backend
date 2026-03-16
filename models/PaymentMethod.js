const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentMethod = sequelize.define('PaymentMethod', {
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
    type: DataTypes.ENUM('Card', 'PayPal', 'Apple Pay', 'Google Pay', 'UPI', 'Cash'),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  lastFour: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'Last 4 digits of card number'
  },
  expiryDate: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Format: MM/YYYY'
  },
  cardholderName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'payment_methods',
  timestamps: true
});

module.exports = PaymentMethod;

