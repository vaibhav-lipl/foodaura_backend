const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Customer user ID (optional for guest orders)'
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    }
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  customerName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  customerAddress: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  customerLatLon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Latitude and Longitude of customer address in "lat,lon" format'
  },
  deliveryPartnerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Delivery partner user ID'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  pickedUpAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveryInstruction: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deliveryOTP: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'online'),
    allowNull: false,
    defaultValue: 'cash'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true
});

module.exports = Order;

