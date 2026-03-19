const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicketMessage = sequelize.define('SupportTicketMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ticket_id'
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sender_id'
  },
  senderType: {
    type: DataTypes.ENUM('customer', 'delivery_partner', 'admin'),
    allowNull: false,
    field: 'sender_type'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  attachments: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('attachments');
      if (!rawValue) {
        return [];
      }

      try {
        return JSON.parse(rawValue);
      } catch (error) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('attachments', JSON.stringify(Array.isArray(value) ? value : []));
    }
  }
}, {
  tableName: 'support_ticket_messages',
  timestamps: true
});

module.exports = SupportTicketMessage;
