const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerSchedule = sequelize.define('DeliveryPartnerSchedule', {
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
  day: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'active', 'completed', 'cancelled'),
    defaultValue: 'scheduled',
    allowNull: false
  }
}, {
  tableName: 'delivery_partner_schedules',
  timestamps: true
});

module.exports = DeliveryPartnerSchedule;

