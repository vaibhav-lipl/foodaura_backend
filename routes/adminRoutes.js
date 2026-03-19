const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const faqController = require('../controllers/faqController');
const supportTicketController = require('../controllers/supportTicketController');
const settingController = require('../controllers/settingController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { body } = require('express-validator');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Admin Dashboard
router.get('/dashboard', adminController.getDashboard);

// Admin Profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim()
], adminController.updateProfile);

// Admin Password Change
router.put('/password', [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], adminController.changePassword);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['admin', 'restaurant', 'delivery_partner', 'customer']),
  body('isActive').optional().isBoolean()
], adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Restaurant Management
router.get('/restaurants', adminController.getRestaurants);
router.put('/restaurants/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], adminController.updateRestaurantStatus);

// Delivery Partner Management
router.get('/delivery-partners', adminController.getDeliveryPartners);
router.put('/delivery-partners/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], adminController.updateDeliveryPartnerStatus);
router.get('/delivery-partners/:userId', adminController.getDeliveryPartnerDetails);

// FAQ Module Management
router.get('/faq-modules', faqController.getFAQModules);
router.post('/faq-modules', faqController.createFAQModule);
router.put('/faq-modules/:id', faqController.updateFAQModule);
router.delete('/faq-modules/:id', faqController.deleteFAQModule);

// FAQ Management
router.get('/faqs', faqController.getAdminFAQs);
router.post('/faqs', faqController.createFAQ);
router.put('/faqs/:id', faqController.updateFAQ);
router.delete('/faqs/:id', faqController.deleteFAQ);

// Support Ticket Management
router.get('/support-tickets', supportTicketController.getAdminSupportTickets);
router.get('/support-tickets/:id', supportTicketController.getAdminSupportTicketDetails);
router.post('/support-tickets/:id/reply', supportTicketController.replyToSupportTicketAsAdmin);
router.put('/support-tickets/:id/status', supportTicketController.updateSupportTicketStatus);

// Settings Management
router.get('/settings', settingController.getSettings);
router.put('/settings', settingController.updateSettings);

module.exports = router;
