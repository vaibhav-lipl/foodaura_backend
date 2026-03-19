require('dotenv').config();
const { connectDB } = require('../config/database');
const { SupportTicket, SupportTicketMessage } = require('../models');

const createSupportTicketTables = async () => {
  try {
    await connectDB();
    await SupportTicket.sync();
    await SupportTicketMessage.sync();
    console.log('Support ticket tables created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create support ticket tables:', error);
    process.exit(1);
  }
};

createSupportTicketTables();
