const { Address } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * @desc    Get user addresses
 * @route   GET /api/customer/addresses
 * @access  Private
 */
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        addresses: addresses.map(addr => ({
          id: addr.id,
          type: addr.type,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          isDefault: addr.isDefault,
          latitude: addr.latitude ? parseFloat(addr.latitude) : null,
          longitude: addr.longitude ? parseFloat(addr.longitude) : null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add address
 * @route   POST /api/customer/addresses
 * @access  Private
 */
exports.addAddress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, address, city, state, zipCode, isDefault, latitude, longitude } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const newAddress = await Address.create({
      userId: req.user.id,
      type: type || 'Home',
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      isDefault: isDefault || false
    });

    res.json({
      success: true,
      message: 'Address added successfully',
      data: {
        address: {
          id: newAddress.id,
          type: newAddress.type,
          address: newAddress.address,
          city: newAddress.city,
          state: newAddress.state,
          zipCode: newAddress.zipCode,
          isDefault: newAddress.isDefault,
          latitude: newAddress.latitude ? parseFloat(newAddress.latitude) : null,
          longitude: newAddress.longitude ? parseFloat(newAddress.longitude) : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/customer/addresses/:addressId
 * @access  Private
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { addressId } = req.params;
    const { type, address, city, state, zipCode, isDefault, latitude, longitude } = req.body;

    const existingAddress = await Address.findOne({
      where: {
        id: addressId,
        userId: req.user.id
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id, id: { [Op.ne]: addressId } } }
      );
    }

    const updateData = {};
    if (type) updateData.type = type;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    await existingAddress.update(updateData);

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address: {
          id: existingAddress.id,
          type: existingAddress.type,
          address: existingAddress.address,
          city: existingAddress.city,
          state: existingAddress.state,
          zipCode: existingAddress.zipCode,
          isDefault: existingAddress.isDefault,
          latitude: existingAddress.latitude ? parseFloat(existingAddress.latitude) : null,
          longitude: existingAddress.longitude ? parseFloat(existingAddress.longitude) : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/customer/addresses/:addressId
 * @access  Private
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findOne({
      where: {
        id: addressId,
        userId: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await address.destroy();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default address
 * @route   PUT /api/customer/addresses/:addressId/set-default
 * @access  Private
 */
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findOne({
      where: {
        id: addressId,
        userId: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset other defaults
    await Address.update(
      { isDefault: false },
      { where: { userId: req.user.id, id: { [Op.ne]: addressId } } }
    );

    // Set this as default
    await address.update({ isDefault: true });

    res.json({
      success: true,
      message: 'Default address updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

