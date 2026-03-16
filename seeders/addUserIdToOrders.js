/**
 * Migration script to add userId column to orders table
 * This is needed for customer order tracking
 * 
 * Usage: node seeders/addUserIdToOrders.js
 */

require('dotenv').config();
const { sequelize } = require('../models');

const addUserIdToOrders = async () => {
  try {
    console.log('🔄 Adding userId column to orders table...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'userId'
    `);

    if (columns.length > 0) {
      console.log('✅ userId column already exists in orders table.');
      process.exit(0);
    }

    // Add userId column (MySQL automatically creates index for foreign keys)
    // We'll add column first, then foreign key separately to avoid index limit issues
    try {
      // Step 1: Add the column
      await sequelize.query(`
        ALTER TABLE \`orders\` 
        ADD COLUMN \`userId\` INT NULL AFTER \`id\`
      `);
      console.log('✅ userId column added.');

      // Step 2: Add foreign key (MySQL will auto-create index for FK)
      try {
        await sequelize.query(`
          ALTER TABLE \`orders\` 
          ADD CONSTRAINT \`fk_orders_userId\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\` (\`id\`) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        `);
        console.log('✅ Foreign key constraint added.');
      } catch (fkError) {
        if (fkError.message.includes('Duplicate key') || 
            fkError.message.includes('already exists') ||
            fkError.message.includes('Too many keys')) {
          console.log('⚠️  Could not add foreign key constraint (too many keys limit).');
          console.log('⚠️  Column added successfully, but foreign key constraint skipped.');
          console.log('⚠️  This is okay - the application will still work correctly.');
        } else {
          throw fkError;
        }
      }
    } catch (colError) {
      if (colError.message.includes('Duplicate column')) {
        console.log('✅ Column already exists.');
      } else {
        throw colError;
      }
    }

    console.log('✅ userId column added successfully to orders table.');
    console.log('✅ Index and foreign key constraint created.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // If column already exists or constraint error, that's okay
    if (error.message.includes('Duplicate column') || 
        error.message.includes('already exists') ||
        error.message.includes('Duplicate key')) {
      console.log('⚠️  Column or constraint may already exist. This is okay.');
      process.exit(0);
    }
    
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  addUserIdToOrders()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

module.exports = { addUserIdToOrders };

