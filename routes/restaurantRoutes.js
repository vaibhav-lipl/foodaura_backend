const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { authenticate, isRestaurantOwner } = require('../middleware/auth');
const { uploadOfferImage } = require('../middleware/upload');
const {
  restaurantProfileValidation,
  menuItemValidation,
  scheduleValidation,
  offerValidation
} = require('../middleware/validation');
const { uploadRestaurantImage, uploadMenuImage } = require('../middleware/upload');

// All routes require authentication and restaurant owner role
router.use(authenticate);
router.use(isRestaurantOwner);

// Restaurant Profile Routes
router.post('/save-restaurant-token', restaurantController.saveRestaurantToken);
router.get('/profile', restaurantController.getProfile);
router.put('/profile', uploadRestaurantImage, restaurantProfileValidation, restaurantController.updateProfile);

// Menu Routes
router.get('/menu', restaurantController.getMenuItems);
router.get('/menu/:id', restaurantController.getMenuItem);
router.post('/menu', uploadMenuImage, menuItemValidation, restaurantController.createMenuItem);
router.put('/menu/:id', uploadMenuImage, menuItemValidation, restaurantController.updateMenuItem);
router.delete('/menu/:id', restaurantController.deleteMenuItem);

// Schedule Routes
router.get('/schedule', restaurantController.getSchedule);
router.put('/schedule', scheduleValidation, restaurantController.updateSchedule);

// Offers Routes
router.get('/offers', restaurantController.getOffers);
router.post('/offers', uploadOfferImage, offerValidation, restaurantController.createOffer);
router.put('/offers/:id', uploadOfferImage, offerValidation, restaurantController.updateOffer);
router.delete('/offers/:id', restaurantController.deleteOffer);

// Statistics Routes
router.get('/statistics', restaurantController.getRestaurantStatistics);

module.exports = router;

