/**
 * Migration script to add foodType column to menus table
 *
 * Usage: node seeders/addFoodTypeToMenus.js
 */

require('dotenv').config();
const { sequelize } = require('../models');

const addFoodTypeToMenus = async () => {
  try {
    console.log('🔄 Adding foodType column to menus table...');

    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menus'
      AND COLUMN_NAME = 'foodType'
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE \`menus\`
        ADD COLUMN \`foodType\` ENUM('veg', 'nonVeg', 'jain') NULL AFTER \`isVeg\`
      `);
      console.log('✅ foodType column added.');
    } else {
      console.log('✅ foodType column already exists.');
    }

    await sequelize.query(`
      UPDATE \`menus\`
      SET \`foodType\` = CASE
        WHEN \`foodType\` IN ('veg', 'nonVeg', 'jain') THEN \`foodType\`
        WHEN \`isVeg\` = 1 THEN 'veg'
        ELSE 'nonVeg'
      END
      WHERE \`foodType\` IS NULL OR \`foodType\` NOT IN ('veg', 'nonVeg', 'jain')
    `);
    console.log('✅ Existing menu rows backfilled.');

    await sequelize.query(`
      ALTER TABLE \`menus\`
      MODIFY COLUMN \`foodType\` ENUM('veg', 'nonVeg', 'jain') NOT NULL DEFAULT 'veg'
    `);
    console.log('✅ foodType column enforced as NOT NULL with default.');

    console.log('✅ foodType migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  addFoodTypeToMenus()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

module.exports = { addFoodTypeToMenus };
