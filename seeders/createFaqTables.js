require('dotenv').config();
const { connectDB } = require('../config/database');
const { FAQModule, FAQ } = require('../models');

const createFaqTables = async () => {
  try {
    await connectDB();
    await FAQModule.sync();
    await FAQ.sync();
    console.log('FAQ tables created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create FAQ tables:', error);
    process.exit(1);
  }
};

createFaqTables();
