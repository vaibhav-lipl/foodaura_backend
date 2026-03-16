const express = require('express');
const router = express.Router();
const { authenticate, isDeliveryPartner } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
}).single('document');

// Controllers
const deliveryPartnerAuthController = require('../controllers/deliveryPartnerAuthController');
const deliveryPartnerProfileController = require('../controllers/deliveryPartnerProfileController');
const deliveryPartnerDocumentController = require('../controllers/deliveryPartnerDocumentController');
const deliveryPartnerVehicleController = require('../controllers/deliveryPartnerVehicleController');
const deliveryPartnerDeliveryController = require('../controllers/deliveryPartnerDeliveryController');
const deliveryPartnerEarningController = require('../controllers/deliveryPartnerEarningController');
const deliveryPartnerRatingController = require('../controllers/deliveryPartnerRatingController');
const deliveryPartnerScheduleController = require('../controllers/deliveryPartnerScheduleController');
const deliveryPartnerPayoutController = require('../controllers/deliveryPartnerPayoutController');
const deliveryPartnerLocationController = require('../controllers/deliveryPartnerLocationController');
const deliveryPartnerDashboardController = require('../controllers/deliveryPartnerDashboardController');
const deliveryPartnerHelpController = require('../controllers/deliveryPartnerHelpController');
const customerNotificationController = require('../controllers/customerNotificationController');

// ==================== AUTHENTICATION ROUTES ====================
router.post('/auth/login/otp', deliveryPartnerAuthController.requestOTP);
router.post('/auth/login/verify', deliveryPartnerAuthController.verifyOTP);
router.post('/auth/register', authenticate, isDeliveryPartner, uploadProfileImage, deliveryPartnerAuthController.register);
router.post('/auth/refresh', deliveryPartnerAuthController.refreshToken);

// ==================== PROFILE ROUTES ====================
router.get('/profile', authenticate, isDeliveryPartner, deliveryPartnerProfileController.getProfile);
router.put('/profile', authenticate, isDeliveryPartner, uploadProfileImage, deliveryPartnerProfileController.updateProfile);

// ==================== DOCUMENTS ROUTES ====================
router.get('/documents', authenticate, isDeliveryPartner, deliveryPartnerDocumentController.getDocuments);
router.post('/documents', authenticate, isDeliveryPartner, uploadDocument, deliveryPartnerDocumentController.uploadDocument);
router.put('/documents/:documentId', authenticate, isDeliveryPartner, uploadDocument, deliveryPartnerDocumentController.updateDocument);

// ==================== VEHICLE ROUTES ====================
router.get('/vehicle', authenticate, isDeliveryPartner, deliveryPartnerVehicleController.getVehicle);
router.put('/vehicle', authenticate, isDeliveryPartner, deliveryPartnerVehicleController.updateVehicle);

// ==================== DELIVERIES ROUTES ====================
router.get('/deliveries/available', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.getAvailableDeliveries);
router.post('/deliveries/:deliveryId/accept', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.acceptDelivery);
router.get('/deliveries/active', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.getActiveDeliveries);
router.get('/orders/:orderId', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.getOrderDetails);
router.put('/orders/:orderId/pickup', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.pickupOrder);
router.put('/orders/:orderId/in-transit', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.updateInTransit);
router.put('/orders/:orderId/deliver', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.completeDelivery);
router.post('/orders/:orderId/cancel', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.cancelDelivery);
router.get('/deliveries/history', authenticate, isDeliveryPartner, deliveryPartnerDeliveryController.getDeliveryHistory);

// ==================== EARNINGS ROUTES ====================
router.get('/earnings/summary', authenticate, isDeliveryPartner, deliveryPartnerEarningController.getEarningsSummary);
router.get('/earnings/breakdown', authenticate, isDeliveryPartner, deliveryPartnerEarningController.getEarningsBreakdown);
router.get('/earnings/statistics', authenticate, isDeliveryPartner, deliveryPartnerEarningController.getEarningsStatistics);

// ==================== RATINGS ROUTES ====================
router.get('/ratings', authenticate, isDeliveryPartner, deliveryPartnerRatingController.getRatings);

// ==================== SCHEDULE ROUTES ====================
router.get('/schedule', authenticate, isDeliveryPartner, deliveryPartnerScheduleController.getSchedule);
router.put('/schedule/availability', authenticate, isDeliveryPartner, deliveryPartnerScheduleController.updateAvailability);
router.put('/status', authenticate, isDeliveryPartner, deliveryPartnerScheduleController.toggleStatus);

// ==================== PAYOUT ROUTES ====================
router.get('/payout-methods', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.getPayoutMethods);
router.post('/payout-methods', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.addPayoutMethod);
router.put('/payout-methods/:payoutMethodId', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.updatePayoutMethod);
router.delete('/payout-methods/:payoutMethodId', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.deletePayoutMethod);
router.post('/payouts/request', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.requestPayout);
router.get('/payouts', authenticate, isDeliveryPartner, deliveryPartnerPayoutController.getPayoutHistory);

// ==================== LOCATION ROUTES ====================
router.post('/location', authenticate, isDeliveryPartner, deliveryPartnerLocationController.updateLocation);
router.post('/orders/:orderId/tracking/start', authenticate, isDeliveryPartner, deliveryPartnerLocationController.startTracking);
router.post('/orders/:orderId/tracking/stop', authenticate, isDeliveryPartner, deliveryPartnerLocationController.stopTracking);

// ==================== NOTIFICATIONS ROUTES ====================
router.get('/notifications', authenticate, isDeliveryPartner, customerNotificationController.getNotifications);
router.put('/notifications/:notificationId/read', authenticate, isDeliveryPartner, customerNotificationController.markAsRead);
router.put('/notifications/read-all', authenticate, isDeliveryPartner, customerNotificationController.markAllAsRead);
router.delete('/notifications/:notificationId', authenticate, isDeliveryPartner, customerNotificationController.deleteNotification);
router.get('/notifications/unread-count', authenticate, isDeliveryPartner, customerNotificationController.getUnreadCount || ((req, res) => {
  // Fallback if method doesn't exist
  res.json({ success: true, unreadCount: 0 });
}));

// ==================== DASHBOARD ROUTES ====================
router.get('/dashboard', authenticate, isDeliveryPartner, deliveryPartnerDashboardController.getDashboard);

// ==================== HELP & SUPPORT ROUTES ====================
router.get('/help/faqs', authenticate, isDeliveryPartner, deliveryPartnerHelpController.getFAQs);
router.post('/help/support-tickets', authenticate, isDeliveryPartner, deliveryPartnerHelpController.submitSupportTicket);
router.get('/help/support-tickets', authenticate, isDeliveryPartner, deliveryPartnerHelpController.getSupportTickets);
router.get('/help/support-tickets/:ticketId', authenticate, isDeliveryPartner, deliveryPartnerHelpController.getSupportTicketDetails);
router.post('/help/support-tickets/:ticketId/reply', authenticate, isDeliveryPartner, deliveryPartnerHelpController.replyToTicket);

module.exports = router;

