const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPartnerProfile = sequelize.define('DeliveryPartnerProfile', {
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
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  profilePicture: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  totalDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'inactive',
    allowNull: false
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  currentLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  currentLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  lastLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  joinedDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'delivery_partner_profiles',
  timestamps: true
});

module.exports = DeliveryPartnerProfile;

