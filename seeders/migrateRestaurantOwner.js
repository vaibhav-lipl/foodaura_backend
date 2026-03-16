/**
 * Migration script to update 'restaurant_owner' role to 'restaurant'
 * Run this once to update existing users in the database
 * 
 * Usage: node seeders/migrateRestaurantOwner.js
 */

require('dotenv').config();
const { sequelize, User } = require('../models');

const migrateRestaurantOwner = async () => {
  try {
    console.log('🔄 Starting migration: restaurant_owner -> restaurant...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Step 1: Check current ENUM structure and update it
    console.log('📝 Step 1: Checking and updating database ENUM column...');
    try {
      // First, check if 'restaurant' exists in ENUM by trying to add it
      // We'll add 'restaurant' to the ENUM if it doesn't exist
      await sequelize.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`role\` ENUM('admin', 'restaurant', 'restaurant_owner', 'delivery_partner', 'customer') 
        NOT NULL DEFAULT 'customer'
      `);
      console.log('✅ ENUM column updated to include "restaurant".');
    } catch (error) {
      // Check if 'restaurant' already exists in ENUM
      const [enumCheck] = await sequelize.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'role'
      `);
      
      const enumValues = enumCheck[0]?.COLUMN_TYPE || '';
      if (enumValues.includes("'restaurant'")) {
        console.log('✅ ENUM already includes "restaurant".');
      } else {
        console.log('⚠️  Could not add "restaurant" to ENUM. Error:', error.message);
        console.log('⚠️  Current ENUM values:', enumValues);
        throw new Error('Cannot proceed: ENUM does not include "restaurant" and cannot be modified.');
      }
    }

    // Step 2: Find all users with 'restaurant_owner' role using raw query
    console.log('📝 Step 2: Finding users with "restaurant_owner" role...');
    const [users] = await sequelize.query(`
      SELECT id, email, role 
      FROM users 
      WHERE role = 'restaurant_owner'
    `);

    if (users.length === 0) {
      console.log('✅ No users with "restaurant_owner" role found. Migration not needed.');
      
      // Final step: Ensure ENUM only has the correct values
      try {
        await sequelize.query(`
          ALTER TABLE \`users\` 
          MODIFY COLUMN \`role\` ENUM('admin', 'restaurant', 'delivery_partner', 'customer') 
          NOT NULL DEFAULT 'customer'
        `);
        console.log('✅ ENUM column cleaned up (removed restaurant_owner).');
      } catch (cleanupError) {
        console.log('⚠️  Could not clean up ENUM, but this is okay if no users need migration.');
      }
      
      process.exit(0);
    }

    console.log(`📊 Found ${users.length} user(s) with "restaurant_owner" role.`);

    // Step 3: Update users using raw SQL (bypasses Sequelize validation)
    console.log('📝 Step 3: Updating user records...');
    let updatedCount = 0;
    for (const user of users) {
      try {
        await sequelize.query(`
          UPDATE users 
          SET role = 'restaurant', updatedAt = NOW() 
          WHERE id = :userId
        `, {
          replacements: { userId: user.id }
        });
        console.log(`✅ Updated user ID ${user.id} (${user.email}): restaurant_owner -> restaurant`);
        updatedCount++;
      } catch (updateError) {
        console.error(`❌ Failed to update user ID ${user.id}:`, updateError.message);
      }
    }

    // Step 4: Final cleanup - remove 'restaurant_owner' from ENUM
    console.log('📝 Step 4: Cleaning up ENUM column...');
    try {
      await sequelize.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`role\` ENUM('admin', 'restaurant', 'delivery_partner', 'customer') 
        NOT NULL DEFAULT 'customer'
      `);
      console.log('✅ ENUM column cleaned up (removed restaurant_owner).');
    } catch (cleanupError) {
      console.log('⚠️  Could not remove restaurant_owner from ENUM:', cleanupError.message);
      console.log('⚠️  This is okay - the middleware handles both roles.');
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📈 Total users updated: ${updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateRestaurantOwner()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

module.exports = { migrateRestaurantOwner };

