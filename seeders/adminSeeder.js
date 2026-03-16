const { User } = require('../models');

/**
 * Seed admin user
 * Run this seeder to create or reset the default admin user
 */
const seedAdmin = async () => {
  try {
    // Check if admin already exists
    let admin = await User.findOne({
      where: { email: 'admin@lemo.com' }
    });

    if (admin) {
      console.log('✅ Admin user already exists. Resetting password to default.');
      // Set plain text password; model hook will hash it
      admin.password = 'Admin@123';
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
    } else {
      // Create admin user (plain password, hooks will hash)
      admin = await User.create({
        name: 'System Administrator',
        email: 'admin@lemo.com',
        password: 'Admin@123',
        phone: '1234567890',
        role: 'admin',
        isActive: true
      });
    }

    console.log('✅ Admin user is ready!');
    console.log('📧 Email: admin@lemo.com');
    console.log('🔑 Password: Admin@123');
    console.log('⚠️  Please change the password after first login!');
    
    return admin;
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  require('dotenv').config();
  const { connectDB } = require('../config/database');
  
  (async () => {
    try {
      await connectDB();
      await seedAdmin();
      process.exit(0);
    } catch (error) {
      console.error('Seeder failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { seedAdmin };

