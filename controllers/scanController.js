const { validateImageQuality } = require('../utils/imageQualityValidator');

/**
 * @desc    Scan and validate food image quality
 * @route   POST /api/scan-food
 * @access  Public (or Private based on your requirements)
 */
exports.scanFood = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image.'
      });
    }

    const imagePath = req.file.path;

    // Validate image quality
    const validationResult = await validateImageQuality(imagePath);

    if (!validationResult.valid) {
      // Return HTTP 422 (Unprocessable Entity) for validation failures
      // Log validation details for debugging (in development)
      const response = {
        success: false,
        message: validationResult.error
      };
      
      if (process.env.NODE_ENV === 'development' && validationResult.details) {
        response.details = validationResult.details;
      }
      
      return res.status(422).json(response);
    }

    // All validations passed
    return res.status(200).json({
      success: true,
      message: 'Image accepted and ready for food item processing.'
    });
  } catch (error) {
    // Handle unexpected errors with HTTP 500
    console.error('Scan food error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing the image. Please try again.'
    });
  }
};

