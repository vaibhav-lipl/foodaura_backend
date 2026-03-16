const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '90d' });
};

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * @desc    Send OTP to phone number
 * @route   POST /api/customer/auth/send-otp
 * @access  Public
 */
exports.sendOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber, countryCode = '+91' } = req.body;

    // Validate phone number (10 digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs for this phone number
    await OTP.destroy({
      where: {
        phoneNumber: cleanPhone,
        isVerified: false
      }
    });

    // Create new OTP
    await OTP.create({
      phoneNumber: cleanPhone,
      countryCode,
      otp,
      expiresAt,
      isVerified: false,
      attempts: 0
    });

    // In production, send OTP via SMS service (Twilio, AWS SNS, etc.)
    // For testing, return OTP in response
    console.log(`OTP for ${countryCode}${cleanPhone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        otpExpiry: expiresAt.toISOString(),
        retryAfter: 60, // seconds
        // Remove this in production
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and authenticate user
 * @route   POST /api/customer/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber, otp } = req.body;

    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Find the most recent OTP for this phone number
    const otpRecord = await OTP.findOne({
      where: {
        phoneNumber: cleanPhone,
        isVerified: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      await otpRecord.update({ attempts: otpRecord.attempts + 1 });
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // Mark OTP as verified
    await otpRecord.update({ isVerified: true });

    // Find or create user
    let user = await User.findOne({
      where: { phone: cleanPhone, role: 'customer' }
    });

    if (!user) {
      // Create new user without password (for OTP login)
      // Use a placeholder email that's unique per phone number
      const tempEmail = `user_${cleanPhone}_${Date.now()}@temp.com`;
      
      user = await User.create({
        name: `User ${cleanPhone.slice(-4)}`,
        email: tempEmail,
        phone: cleanPhone,
        role: 'customer',
        // Don't set password - it will be null/undefined for OTP users
        isActive: true
      }, {
        // Skip password validation for OTP users
        fields: ['name', 'email', 'phone', 'role', 'isActive']
      });
    } else if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Add or update FCM token if provided (optional, can be done in a separate endpoint)
    const { fcmToken } = req.body;
    if (fcmToken) {
      await user.update({ fcmToken });
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/customer/auth/resend-otp
 * @access  Public
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;

    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Check rate limiting (prevent spam)
    const recentOTP = await OTP.findOne({
      where: {
        phoneNumber: cleanPhone
      },
      order: [['createdAt', 'DESC']]
    });

    if (recentOTP) {
      const timeSinceLastOTP = Date.now() - new Date(recentOTP.createdAt).getTime();
      if (timeSinceLastOTP < 60000) { // 1 minute
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting a new OTP.',
          data: {
            retryAfter: Math.ceil((60000 - timeSinceLastOTP) / 1000)
          }
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTPs
    await OTP.destroy({
      where: {
        phoneNumber: cleanPhone,
        isVerified: false
      }
    });

    // Create new OTP
    await OTP.create({
      phoneNumber: cleanPhone,
      countryCode: '+91',
      otp,
      expiresAt,
      isVerified: false,
      attempts: 0
    });

    console.log(`Resent OTP for ${cleanPhone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpExpiry: expiresAt.toISOString(),
        retryAfter: 60,
        // Remove this in production
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/customer/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    // In a more advanced implementation, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/customer/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(400).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Generate new tokens
      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  } catch (error) {
    next(error);
  }
};

