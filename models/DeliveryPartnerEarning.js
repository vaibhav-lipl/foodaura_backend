const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerEarning = sequelize.define('DeliveryPartnerEarning', {
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
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  basePay: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  tip: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'credited', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  creditedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'delivery_partner_earnings',
  timestamps: true
});

module.exports = DeliveryPartnerEarning;

