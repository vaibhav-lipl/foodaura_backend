const { body } = require('express-validator');
const { MENU_FOOD_TYPES, normalizeLegacyIsVeg } = require('../utils/menuFoodType');

// Auth validation
exports.signupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Restaurant setup validation (Step 2 of signup)
exports.restaurantSetupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Restaurant name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Restaurant name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  body('zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must be less than 20 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('cuisineType')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Cuisine type must be less than 100 characters'),
  body('imageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL')
];

// Restaurant validation
exports.restaurantProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Restaurant name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Restaurant name must be less than 200 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
];

// Menu validation
exports.menuItemValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Menu item name is required')
    .isLength({ max: 200 })
    .withMessage('Menu item name must be less than 200 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('description')
    .optional()
    .trim(),
  body('foodType')
    .customSanitizer((value) => {
      if (value === undefined || value === null) {
        return value;
      }

      return String(value).trim();
    })
    .custom((value, { req }) => {
      if (value === undefined || value === null || value === '') {
        if (req.body.isVeg === undefined || req.body.isVeg === null || req.body.isVeg === '') {
          throw new Error('foodType is required');
        }

        return true;
      }

      if (!MENU_FOOD_TYPES.includes(value)) {
        throw new Error('foodType must be one of veg, nonVeg, jain');
      }

      return true;
    }),
  // Note: imageUrl validation removed - images are uploaded via file upload
  // body('imageUrl') - handled by file upload middleware
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean')
    .toBoolean(),
  body('isVeg')
    .optional()
    .custom((value) => normalizeLegacyIsVeg(value) !== undefined)
    .withMessage('isVeg must be a boolean')
    .customSanitizer((value) => normalizeLegacyIsVeg(value)),
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive integer')
];

// Schedule validation
exports.scheduleValidation = [
  body('schedules')
    .isArray()
    .withMessage('Schedules must be an array')
    .notEmpty()
    .withMessage('At least one schedule is required'),
  body('schedules.*.dayOfWeek')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),
  body('schedules.*.openTime')
    .notEmpty()
    .withMessage('Open time is required')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Open time must be in HH:mm format'),
  body('schedules.*.closeTime')
    .notEmpty()
    .withMessage('Close time is required')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Close time must be in HH:mm format'),
  body('schedules.*.isClosed')
    .optional()
    .isBoolean()
    .withMessage('isClosed must be a boolean')
];

// Offer validation
exports.offerValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Offer title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),
  body('discountValue')
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount must be a positive number'),
  body('maxDiscount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum discount must be a positive number'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Code must be less than 50 characters')
];

// Customer Auth validation
exports.sendOTPValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,3}$/)
    .withMessage('Country code must be in format +XX')
];

exports.verifyOTPValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .matches(/^\d{4}$/)
    .withMessage('OTP must be 4 digits')
];

exports.resendOTPValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits')
];

// Customer Profile validation
exports.updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
];

// Address validation
exports.addressValidation = [
  body('type')
    .optional()
    .isIn(['Home', 'Work', 'Other'])
    .withMessage('Type must be Home, Work, or Other'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  body('zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must be less than 20 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

// Payment Method validation
exports.paymentMethodValidation = [
  body('type')
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['Card', 'PayPal', 'Apple Pay', 'Google Pay', 'UPI', 'Cash'])
    .withMessage('Invalid payment type'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name must be less than 200 characters'),
  body('cardNumber')
    .optional()
    .trim()
    .matches(/^\d{13,19}$/)
    .withMessage('Card number must be 13-19 digits'),
  body('expiryDate')
    .optional()
    .trim()
    .matches(/^(0[1-9]|1[0-2])\/\d{4}$/)
    .withMessage('Expiry date must be in MM/YYYY format'),
  body('cvv')
    .optional()
    .trim()
    .matches(/^\d{3,4}$/)
    .withMessage('CVV must be 3 or 4 digits'),
  body('cardholderName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Cardholder name must be less than 100 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

// Order validation
exports.createOrderValidation = [
  body('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isInt({ min: 1 })
    .withMessage('Restaurant ID must be a positive integer'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  body('items.*.menuItemId')
    .if(body('items').isArray())
    .isInt({ min: 1 })
    .withMessage('Menu item ID must be a positive integer'),
  body('items.*.quantity')
    .if(body('items').isArray())
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('deliveryAddressId')
    .notEmpty()
    .withMessage('Delivery address ID is required')
    .isInt({ min: 1 })
    .withMessage('Delivery address ID must be a positive integer'),
  body('paymentMethodId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Payment method ID must be a positive integer'),
  body('promoCode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Promo code must be less than 50 characters'),
  body('deliveryInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delivery instructions must be less than 500 characters')
];

// Cart validation
exports.addToCartValidation = [
  body('menuItemId')
    .notEmpty()
    .withMessage('Menu item ID is required')
    .isInt({ min: 1 })
    .withMessage('Menu item ID must be a positive integer'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('restaurantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Restaurant ID must be a positive integer'),
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions must be less than 500 characters')
];

// Favorite validation
exports.addFavoriteValidation = [
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['Restaurant', 'Dish'])
    .withMessage('Type must be Restaurant or Dish'),
  body('restaurantId')
    .if(body('type').equals('Restaurant'))
    .notEmpty()
    .withMessage('Restaurant ID is required for Restaurant type')
    .isInt({ min: 1 })
    .withMessage('Restaurant ID must be a positive integer'),
  body('menuItemId')
    .if(body('type').equals('Dish'))
    .notEmpty()
    .withMessage('Menu item ID is required for Dish type')
    .isInt({ min: 1 })
    .withMessage('Menu item ID must be a positive integer')
];

// Review validation
exports.submitReviewValidation = [
  body('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required')
    .isInt({ min: 1 })
    .withMessage('Restaurant ID must be a positive integer'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters'),
  body('orderId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),
  body('itemRatings')
    .optional()
    .isArray()
    .withMessage('Item ratings must be an array')
];

exports.submitDeliveryPartnerReviewValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters')
];
