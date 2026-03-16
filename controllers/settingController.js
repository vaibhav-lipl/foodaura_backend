const { Setting } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');

// ===============================
// GET SETTINGS
// ===============================
exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();

    // create default settings if table is empty
    if (!settings) {
      settings = await Setting.create({
        supportEmail: 'support@foodapp.com',
        supportPhone: '9999999999',
      });
    }

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get Settings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
    });
  }
};

// ===============================
// UPDATE SETTINGS
// ===============================
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      await settings.update(req.body);
    }

    return res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
    });
  }
};
