const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerPayout = sequelize.define('DeliveryPartnerPayout', {
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
  payoutMethodId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'delivery_partner_payout_methods',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'delivery_partner_payouts',
  timestamps: true
});

module.exports = DeliveryPartnerPayout;

