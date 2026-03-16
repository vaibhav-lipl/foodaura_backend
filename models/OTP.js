const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    index: true
  },
  countryCode: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '+91'
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'otps',
  timestamps: true,
  indexes: [
    {
      fields: ['phoneNumber', 'createdAt']
    }
  ]
});

module.exports = OTP;

