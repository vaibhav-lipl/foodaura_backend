const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerPayoutMethod = sequelize.define('DeliveryPartnerPayoutMethod', {
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
    type: DataTypes.ENUM('bank_account', 'upi'),
    allowNull: false
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  accountNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  ifscCode: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  accountHolderName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  upiId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'delivery_partner_payout_methods',
  timestamps: true
});

module.exports = DeliveryPartnerPayoutMethod;

