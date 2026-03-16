const { User, DeliveryPartnerProfile } = require('../models');
const { getImageUrl } = require('../middleware/upload');

/**
 * @desc    Get Profile
 * @route   GET /api/captain/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await DeliveryPartnerProfile.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found'
        }
      });
    }

    const profileData = {
      id: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      pincode: profile.pincode,
      profilePicture: profile.profilePicture ? getImageUrl(req, profile.profilePicture, 'profileImage') : null,
      rating: parseFloat(profile.rating) || 0,
      totalDeliveries: profile.totalDeliveries || 0,
      status: profile.status,
      verificationStatus: profile.verificationStatus,
      joinedDate: profile.joinedDate
    };

    res.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Profile
 * @route   PUT /api/captain/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      email,
      address,
      city,
      state,
      pincode
    } = req.body;

    let profile = await DeliveryPartnerProfile.findOne({ where: { userId } });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found'
        }
      });
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (pincode) updateData.pincode = pincode;

    if (req.file) {
      updateData.profilePicture = req.file.filename;
    }

    await profile.update(updateData);

    // Update user email if provided
    if (email) {
      await User.update({ email }, { where: { id: userId } });
    }

    const updatedProfile = await DeliveryPartnerProfile.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }]
    });

    const profileData = {
      id: updatedProfile.userId,
      fullName: updatedProfile.fullName,
      email: updatedProfile.email,
      phoneNumber: updatedProfile.phoneNumber,
      dateOfBirth: updatedProfile.dateOfBirth,
      address: updatedProfile.address,
      city: updatedProfile.city,
      state: updatedProfile.state,
      pincode: updatedProfile.pincode,
      profilePicture: updatedProfile.profilePicture ? getImageUrl(req, updatedProfile.profilePicture, 'profileImage') : null,
      rating: parseFloat(updatedProfile.rating) || 0,
      totalDeliveries: updatedProfile.totalDeliveries || 0,
      status: updatedProfile.status,
      verificationStatus: updatedProfile.verificationStatus,
      joinedDate: updatedProfile.joinedDate
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: profileData
    });
  } catch (error) {
    next(error);
  }
};

