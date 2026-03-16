const { DeliveryPartnerVehicle } = require('../models');
const { getImageUrl } = require('../middleware/upload');

/**
 * @desc    Get Vehicle Details
 * @route   GET /api/captain/vehicle
 * @access  Private
 */
exports.getVehicle = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vehicle = await DeliveryPartnerVehicle.findOne({
      where: { userId }
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vehicle details not found'
        }
      });
    }

    res.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registrationNumber: vehicle.registrationNumber,
        color: vehicle.color,
        registrationDocument: vehicle.registrationDocument ? getImageUrl(req, vehicle.registrationDocument, 'profileImage') : null,
        insuranceDocument: vehicle.insuranceDocument ? getImageUrl(req, vehicle.insuranceDocument, 'profileImage') : null,
        insuranceExpiry: vehicle.insuranceExpiry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Vehicle Details
 * @route   PUT /api/captain/vehicle
 * @access  Private
 */
exports.updateVehicle = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      type,
      make,
      model,
      year,
      registrationNumber,
      color,
      insuranceExpiry
    } = req.body;

    let vehicle = await DeliveryPartnerVehicle.findOne({ where: { userId } });

    const vehicleData = {};
    if (type) vehicleData.type = type;
    if (make) vehicleData.make = make;
    if (model) vehicleData.model = model;
    if (year) vehicleData.year = year;
    if (registrationNumber) vehicleData.registrationNumber = registrationNumber;
    if (color) vehicleData.color = color;
    if (insuranceExpiry) vehicleData.insuranceExpiry = insuranceExpiry;

    // Handle file uploads if needed (you may need to add separate endpoints for document uploads)
    // if (req.files?.registrationDocument) {
    //   vehicleData.registrationDocument = req.files.registrationDocument[0].filename;
    // }
    // if (req.files?.insuranceDocument) {
    //   vehicleData.insuranceDocument = req.files.insuranceDocument[0].filename;
    // }

    if (vehicle) {
      await vehicle.update(vehicleData);
    } else {
      vehicle = await DeliveryPartnerVehicle.create({
        userId,
        ...vehicleData
      });
    }

    res.json({
      success: true,
      message: 'Vehicle details updated successfully',
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registrationNumber: vehicle.registrationNumber,
        color: vehicle.color,
        registrationDocument: vehicle.registrationDocument ? getImageUrl(req, vehicle.registrationDocument, 'profileImage') : null,
        insuranceDocument: vehicle.insuranceDocument ? getImageUrl(req, vehicle.insuranceDocument, 'profileImage') : null,
        insuranceExpiry: vehicle.insuranceExpiry
      }
    });
  } catch (error) {
    next(error);
  }
};

