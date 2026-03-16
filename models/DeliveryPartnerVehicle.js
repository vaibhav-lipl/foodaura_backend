const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerVehicle = sequelize.define('DeliveryPartnerVehicle', {
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
  type: {
    type: DataTypes.ENUM('bike', 'scooter', 'car', 'bicycle'),
    allowNull: false
  },
  make: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  year: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  registrationNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  registrationDocument: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  insuranceDocument: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  insuranceExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'delivery_partner_vehicles',
  timestamps: true
});

module.exports = DeliveryPartnerVehicle;

