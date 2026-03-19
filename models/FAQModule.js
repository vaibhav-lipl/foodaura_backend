const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FAQModule = sequelize.define('FAQModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'faq_modules',
  timestamps: true
});

module.exports = FAQModule;
