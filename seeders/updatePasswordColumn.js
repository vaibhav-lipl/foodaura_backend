/**
 * Migration script to update password column to allow NULL
 * This is needed for OTP-based customer authentication
 * 
 * Usage: node seeders/updatePasswordColumn.js
 */

require('dotenv').config();
const { sequelize } = require('../models');

const updatePasswordColumn = async () => {
  try {
    console.log('🔄 Updating password column to allow NULL...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Update the password column to allow NULL
    await sequelize.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`password\` VARCHAR(255) NULL
    `);

    console.log('✅ Password column updated successfully to allow NULL.');
    console.log('✅ OTP-based authentication can now create users without passwords.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
      console.log('⚠️  Column may already be updated. This is okay.');
      process.exit(0);
    }
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  updatePasswordColumn()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

module.exports = { updatePasswordColumn };

