const { User, OTP, DeliveryPartnerProfile } = require('../models');
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
 * @desc    Request OTP for Login
 * @route   POST /api/captain/auth/login/otp
 * @access  Public
 */
exports.requestOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number is required'
        }
      });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number must be 10 digits'
        }
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      countryCode: '+91',
      otp,
      expiresAt,
      isVerified: false,
      attempts: 0
    });

    // In production, send OTP via SMS service
    console.log(`OTP for ${cleanPhone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sessionId: sessionId,
      // Remove this in production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and Login
 * @route   POST /api/captain/auth/login/verify
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otp, sessionId } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number and OTP are required'
        }
      });
    }

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
        error: {
          code: 'NOT_FOUND',
          message: 'OTP not found. Please request a new OTP.'
        }
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPIRED',
          message: 'OTP has expired. Please request a new OTP.'
        }
      });
    }

    // Check attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MAX_ATTEMPTS',
          message: 'Maximum attempts exceeded. Please request a new OTP.'
        }
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      await otpRecord.update({ attempts: otpRecord.attempts + 1 });
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid OTP. Please try again.'
        }
      });
    }

    // Mark OTP as verified
    await otpRecord.update({ isVerified: true });

    // Find or create user
    let user = await User.findOne({
      where: { phone: cleanPhone, role: 'delivery_partner' },
      include: [{
        model: DeliveryPartnerProfile,
        as: 'deliveryPartnerProfile'
      }]
    });

    if (!user) {
      // Create new user
      const tempEmail = `captain_${cleanPhone}_${Date.now()}@temp.com`;

      user = await User.create({
        name: `Captain ${cleanPhone.slice(-4)}`,
        email: tempEmail,
        phone: cleanPhone,
        role: 'delivery_partner',
        isActive: true
      }, {
        fields: ['name', 'email', 'phone', 'role', 'isActive']
      });

      // Create profile
      // await DeliveryPartnerProfile.create({
      //   userId: user.id,
      //   fullName: user.name,
      //   phoneNumber: cleanPhone,
      //   email: tempEmail,
      //   status: 'inactive',
      //   verificationStatus: 'pending'
      // });
    } else if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive. Please contact support.'
        }
      });
    }

    // Add or update FCM token if provided (optional, can be done in a separate endpoint)
    const { fcmToken } = req.body;
    if (fcmToken) {
      await user.update({ fcmToken });
    }

    // Reload user with profile
    user = await User.findByPk(user.id, {
      include: [{
        model: DeliveryPartnerProfile,
        as: 'deliveryPartnerProfile'
      }]
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone,
        name: user.name,
        email: user.email,
        isRegistered: !!user.deliveryPartnerProfile,
        status: user.deliveryPartnerProfile?.status || 'inactive'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register Delivery Partner
 * @route   POST /api/captain/auth/register
 * @access  Private (after OTP verification)
 */
exports.register = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      email,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      registrationNumber,
      vehicleColor
    } = req.body;

    // Check if profile already exists
    let profile = await DeliveryPartnerProfile.findOne({ where: { userId } });

    if (profile && profile.verificationStatus === 'verified') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_EXISTS',
          message: 'Delivery partner already registered'
        }
      });
    }

    // Create or update profile
    const profileData = {
      userId,
      fullName,
      phoneNumber: req.user.phone,
      email,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      verificationStatus: 'pending',
      status: 'inactive'
    };

    if (req.file) {
      profileData.profilePicture = req.file.filename;
    }

    if (profile) {
      await profile.update(profileData);
    } else {
      profile = await DeliveryPartnerProfile.create(profileData);
    }

    // Create or update vehicle
    const { DeliveryPartnerVehicle } = require('../models');
    let vehicle = await DeliveryPartnerVehicle.findOne({ where: { userId } });

    const vehicleData = {
      userId,
      type: vehicleType,
      make: vehicleMake,
      model: vehicleModel,
      year: vehicleYear,
      registrationNumber,
      color: vehicleColor
    };

    if (vehicle) {
      await vehicle.update(vehicleData);
    } else {
      vehicle = await DeliveryPartnerVehicle.create(vehicleData);
    }

    res.json({
      success: true,
      message: 'Registration successful',
      captainId: userId,
      verificationStatus: 'pending'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh Token
 * @route   POST /api/captain/auth/refresh
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        });
      }

      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'User not found or inactive'
          }
        });
      }

      // Generate new tokens
      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

