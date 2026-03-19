const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'ticket_number'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  userType: {
    type: DataTypes.ENUM('customer', 'delivery_partner'),
    allowNull: false,
    field: 'user_type'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  }
}, {
  tableName: 'support_tickets',
  timestamps: true
});

module.exports = SupportTicket;
