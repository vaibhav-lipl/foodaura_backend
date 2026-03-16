require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Sync database models
    // Note: { alter: true } can cause issues if tables have too many indexes (MySQL limit: 64)
    // In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      const { sequelize } = require('./models');
      try {
        // Try to sync without altering (safer for existing tables)
        await sequelize.sync({ alter: false });
        console.log('✅ Database models synchronized.');
      } catch (syncError) {
        // If sync fails due to too many keys, just log and continue
        if (syncError.name === 'SequelizeDatabaseError' && syncError.original?.code === 'ER_TOO_MANY_KEYS') {
          console.warn('⚠️  Database sync skipped: Too many indexes on existing tables.');
          console.warn('⚠️  Tables already exist. Using existing schema.');
        } else {
          // Re-throw other errors
          throw syncError;
        }
      }
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;

