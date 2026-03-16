const express = require('express');
const router = express.Router();
const { authenticate, isCustomer } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');
const optionalAuth = require('../middleware/optionalAuth');
const {
  sendOTPValidation,
  verifyOTPValidation,
  resendOTPValidation,
  updateProfileValidation,
  addressValidation,
  paymentMethodValidation,
  createOrderValidation,
  addToCartValidation,
  addFavoriteValidation,
  submitReviewValidation,
  submitDeliveryPartnerReviewValidation
} = require('../middleware/validation');

// Controllers
const settingController = require('../controllers/settingController');
const customerAuthController = require('../controllers/customerAuthController');
const customerProfileController = require('../controllers/customerProfileController');
const customerRestaurantController = require('../controllers/customerRestaurantController');
const customerMenuController = require('../controllers/customerMenuController');
const customerCartController = require('../controllers/customerCartController');
const customerOrderController = require('../controllers/customerOrderController');
const customerAddressController = require('../controllers/customerAddressController');
const customerPaymentController = require('../controllers/customerPaymentController');
const customerFavoriteController = require('../controllers/customerFavoriteController');
const customerCategoryController = require('../controllers/customerCategoryController');
const customerPromotionController = require('../controllers/customerPromotionController');
const customerPopularController = require('../controllers/customerPopularController');
const customerSearchController = require('../controllers/customerSearchController');
const customerNotificationController = require('../controllers/customerNotificationController');
const customerReviewController = require('../controllers/customerReviewController');

// ==================== AUTHENTICATION ROUTES ====================
router.post('/auth/send-otp', sendOTPValidation, customerAuthController.sendOTP);
router.post('/auth/verify-otp', verifyOTPValidation, customerAuthController.verifyOTP);
router.post('/auth/resend-otp', resendOTPValidation, customerAuthController.resendOTP);
router.post('/auth/logout', authenticate, customerAuthController.logout);
router.post('/auth/refresh-token', customerAuthController.refreshToken);

// ==================== USER PROFILE ROUTES ====================
router.get('/users/profile', authenticate, customerProfileController.getProfile);
router.put('/users/profile', authenticate, uploadProfileImage, updateProfileValidation, customerProfileController.updateProfile);
router.delete('/users/profile', authenticate, customerProfileController.deleteAccount);

// ==================== RESTAURANT ROUTES ====================
router.get('/restaurants', optionalAuth, customerRestaurantController.getRestaurants); // Optional auth
router.get('/restaurants/search', optionalAuth, customerRestaurantController.searchRestaurants); // Optional auth
router.get('/restaurants/:restaurantId', optionalAuth, customerRestaurantController.getRestaurantDetails); // Optional auth
router.post('/restaurants/:restaurantId/like', authenticate, customerRestaurantController.toggleLike);
router.delete('/restaurants/:restaurantId/like', authenticate, customerRestaurantController.toggleLike);

// ==================== MENU ROUTES ====================
router.get('/restaurants/:restaurantId/menu', optionalAuth, customerMenuController.getRestaurantMenu); // Optional auth
router.get('/menu-items/:menuItemId', optionalAuth, customerMenuController.getMenuItemDetails); // Optional auth

// ==================== CART ROUTES ====================
router.get('/cart', authenticate, customerCartController.getCart);
router.post('/cart/items', authenticate, addToCartValidation, customerCartController.addToCart);
router.put('/cart/items/:cartItemId', authenticate, customerCartController.updateCartItem);
router.delete('/cart/items/:cartItemId', authenticate, customerCartController.removeFromCart);
router.delete('/cart', authenticate, customerCartController.clearCart);
router.post('/cart/calculate', authenticate, customerCartController.calculateCart);

// ==================== ORDER ROUTES ====================
router.post('/orders', authenticate, createOrderValidation, customerOrderController.createOrder);
router.get('/orders', authenticate, customerOrderController.getOrders);
router.get('/orders/history', authenticate, customerOrderController.getOrderHistory);
router.get('/orders/:orderId', authenticate, customerOrderController.getOrderDetails);
router.post('/orders/:orderId/cancel', authenticate, customerOrderController.cancelOrder);
router.get('/orders/:orderId/track', authenticate, customerOrderController.trackOrder);
router.post('/orders/:orderId/reorder', authenticate, customerOrderController.createOrder); // Reuse createOrder

// ==================== ADDRESS ROUTES ====================
router.get('/addresses', authenticate, customerAddressController.getAddresses);
router.post('/addresses', authenticate, addressValidation, customerAddressController.addAddress);
router.put('/addresses/:addressId', authenticate, addressValidation, customerAddressController.updateAddress);
router.delete('/addresses/:addressId', authenticate, customerAddressController.deleteAddress);
router.put('/addresses/:addressId/set-default', authenticate, customerAddressController.setDefaultAddress);

// ==================== PAYMENT METHOD ROUTES ====================
router.get('/payment-methods', authenticate, customerPaymentController.getPaymentMethods);
router.post('/payment-methods', authenticate, paymentMethodValidation, customerPaymentController.addPaymentMethod);
router.put('/payment-methods/:paymentMethodId', authenticate, paymentMethodValidation, customerPaymentController.updatePaymentMethod);
router.delete('/payment-methods/:paymentMethodId', authenticate, customerPaymentController.deletePaymentMethod);
router.put('/payment-methods/:paymentMethodId/set-default', authenticate, customerPaymentController.setDefaultPaymentMethod);
router.post('/payments/process', authenticate, customerPaymentController.processPayment);

// ==================== FAVORITES ROUTES ====================
router.get('/favorites', authenticate, customerFavoriteController.getFavorites);
router.post('/favorites', authenticate, addFavoriteValidation, customerFavoriteController.addFavorite);
router.delete('/favorites/:favoriteId', authenticate, customerFavoriteController.removeFavorite);
router.get('/favorites/check', authenticate, customerFavoriteController.checkFavorite);

// ==================== CATEGORIES ROUTES ====================
router.get('/categories', optionalAuth, customerCategoryController.getCategories); // Optional auth

// ==================== PROMOTIONS ROUTES ====================
router.get('/promotions', optionalAuth, customerPromotionController.getPromotions); // Optional auth
router.get('/promotions/active', optionalAuth, customerPromotionController.getActivePromotions); // Optional auth
router.post('/promotions/validate', authenticate, customerPromotionController.validatePromoCode);

// ==================== POPULAR ITEMS ROUTES ====================
router.get('/items/popular', optionalAuth, customerPopularController.getPopularItems); // Optional auth
// ==================== SEARCH ROUTES ====================
router.get('/search', optionalAuth, customerSearchController.globalSearch); // Optional auth
router.get('/search/suggestions', optionalAuth, customerSearchController.getSearchSuggestions); // Optional auth

// ==================== NOTIFICATIONS ROUTES ====================
router.get('/notifications', authenticate, customerNotificationController.getNotifications);
router.put('/notifications/:notificationId/read', authenticate, customerNotificationController.markAsRead);
router.put('/notifications/read-all', authenticate, customerNotificationController.markAllAsRead);
router.delete('/notifications/:notificationId', authenticate, customerNotificationController.deleteNotification);

// ==================== REVIEWS ROUTES ====================
router.get('/restaurants/:restaurantId/reviews', customerReviewController.getRestaurantReviews); // Optional auth
router.post('/reviews', authenticate, submitReviewValidation, customerReviewController.submitReview);
router.post('/delivery-partner-reviews', authenticate, submitDeliveryPartnerReviewValidation, customerReviewController.submitDeliveryPartnerReview);

// ==================== SETTINGS ROUTES ====================
router.get('/settings', authenticate, settingController.getSettings);

// ==================== DELIVERY PARTNER ROUTES ====================
router.get('/delivery-partners-current-location', authenticate, customerOrderController.getDeliveryPartnersCurrentLocation);

module.exports = router;
