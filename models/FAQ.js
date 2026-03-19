const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FAQ = sequelize.define('FAQ', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moduleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'module_id',
    references: {
      model: 'faq_modules',
      key: 'id'
    }
  },
  userType: {
    type: DataTypes.ENUM('customer', 'delivery_partner'),
    allowNull: false,
    field: 'user_type'
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'faqs',
  timestamps: true
});

module.exports = FAQ;
