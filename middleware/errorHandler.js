const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large. Maximum file size is 5MB.',
      statusCode: 400
    };
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field. Please use the correct field name.',
      statusCode: 400
    };
  } else if (err.message && err.message.includes('Invalid file type')) {
    error = {
      message: err.message,
      statusCode: 400
    };
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered.';
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference. Related record does not exist.';
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize database error
  if (err.name === 'SequelizeDatabaseError') {
    const message = 'Database error occurred.';
    error = {
      message,
      statusCode: 500
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };

