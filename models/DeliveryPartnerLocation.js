const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerLocation = sequelize.define('DeliveryPartnerLocation', {
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
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  accuracy: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  heading: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  speed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'delivery_partner_locations',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'timestamp']
    },
    {
      fields: ['orderId', 'timestamp']
    }
  ]
});

module.exports = DeliveryPartnerLocation;

