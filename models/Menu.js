const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  MENU_FOOD_TYPES,
  normalizeMenuFoodType,
  normalizeLegacyIsVeg,
  foodTypeToLegacyIsVeg,
  legacyIsVegToFoodType
} = require('../utils/menuFoodType');

const Menu = sequelize.define('Menu', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVeg: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  foodType: {
    type: DataTypes.ENUM(...MENU_FOOD_TYPES),
    allowNull: false,
    defaultValue: 'veg',
    validate: {
      isIn: [MENU_FOOD_TYPES]
    },
    get() {
      return normalizeMenuFoodType(this.getDataValue('foodType'))
        || legacyIsVegToFoodType(this.getDataValue('isVeg'))
        || 'veg';
    },
    set(value) {
      const normalizedFoodType = normalizeMenuFoodType(value);

      if (!normalizedFoodType) {
        throw new Error('foodType must be one of veg, nonVeg, jain');
      }

      this.setDataValue('foodType', normalizedFoodType);
      this.setDataValue('isVeg', foodTypeToLegacyIsVeg(normalizedFoodType));
    }
  },
  preparationTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Preparation time in minutes'
  },
  totalSold: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'menus',
  timestamps: true,
  hooks: {
    beforeValidate(menu) {
      const normalizedFoodType = normalizeMenuFoodType(menu.getDataValue('foodType'));
      const normalizedIsVeg = normalizeLegacyIsVeg(menu.getDataValue('isVeg'));

      if (normalizedFoodType) {
        menu.setDataValue('foodType', normalizedFoodType);
        menu.setDataValue('isVeg', foodTypeToLegacyIsVeg(normalizedFoodType));
        return;
      }

      if (normalizedIsVeg !== undefined) {
        menu.setDataValue('foodType', legacyIsVegToFoodType(normalizedIsVeg));
        menu.setDataValue('isVeg', normalizedIsVeg);
        return;
      }

      if (menu.isNewRecord) {
        menu.setDataValue('foodType', 'veg');
        menu.setDataValue('isVeg', true);
      }
    }
  }
});

module.exports = Menu;
