const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

const Setting = sequelize.define('Setting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    appName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Food Delivery App',
    },

    supportEmail: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    supportPhone: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    minOrderAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },

    deliveryCharge: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },

    taxPercent: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },

    isOrderEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

    isCodEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

    isRestaurantSignupEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
},
    {
        tableName: 'settings',
        timestamps: true,
    }
);

module.exports = Setting;
