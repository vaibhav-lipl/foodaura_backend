const { DeliveryPartnerLocation, DeliveryPartnerProfile } = require('../models');

/**
 * @desc    Update Current Location
 * @route   POST /api/captain/location
 * @access  Private
 */
exports.updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy, heading, speed, timestamp } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        }
      });
    }

    // Save location history
    await DeliveryPartnerLocation.create({
      userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      heading: heading ? parseFloat(heading) : null,
      speed: speed ? parseFloat(speed) : null,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Update profile current location
    const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
    if (profile) {
      await profile.update({
        currentLatitude: parseFloat(latitude),
        currentLongitude: parseFloat(longitude),
        lastLocationUpdate: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start Location Tracking (for active delivery)
 * @route   POST /api/captain/orders/:orderId/tracking/start
 * @access  Private
 */
exports.startTracking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Verify order belongs to this captain
    const { Order } = require('../models');
    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Location tracking started'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stop Location Tracking
 * @route   POST /api/captain/orders/:orderId/tracking/stop
 * @access  Private
 */
exports.stopTracking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Verify order belongs to this captain
    const { Order } = require('../models');
    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Location tracking stopped'
    });
  } catch (error) {
    next(error);
  }
};

