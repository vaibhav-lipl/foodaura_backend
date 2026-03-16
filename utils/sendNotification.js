// utils/sendNotification.js
// IMPORTANT (as per your setup):
// - Use `config/appfirebase.js` for MOBILE apps (customer & delivery partner)
// - Use `config/firebase.js` for WEB restaurant panel
const firebaseMobile = require('../config/appfirebase'); // Mobile (customer, delivery partner)
const firebaseWeb = require('../config/firebase');       // Restaurant (web)

/**
 * Get the appropriate Firebase admin instance based on user role
 * @param {string} userRole - User role: 'restaurant', 'customer', 'delivery_partner', 'admin'
 * @returns {Object} Firebase admin instance
 */
const getFirebaseInstance = (userRole) => {
  // Restaurant uses web Firebase config (`firebase.js` in your setup)
  if (userRole === 'restaurant') {
    return firebaseWeb;
  }
  // Customer and delivery partner use mobile Firebase config (`appfirebase.js` in your setup)
  // Admin can use mobile Firebase as default
  return firebaseMobile;
};

/**
 * Send notification to single device
 * @param {Object} params - Notification parameters
 * @param {string} params.token - FCM token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @param {string} params.userRole - User role to determine which Firebase instance to use
 */
const sendToDevice = async ({ token, title, body, data = {}, userRole = 'customer' }) => {
  try {
    if (!token) {
      console.warn('No FCM token provided');
      return { success: false, error: 'No FCM token provided' };
    }

    const admin = getFirebaseInstance(userRole);
    
    if (!admin) {
      console.error('Firebase not initialized for role:', userRole);
      return { success: false, error: 'Firebase not initialized' };
    }
    
    const message = {
      token,
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('FCM Single Send Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple devices
 * @param {Object} params - Notification parameters
 * @param {Array<string>} params.tokens - Array of FCM tokens
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @param {string} params.userRole - User role to determine which Firebase instance to use
 */
const sendToMultipleDevices = async ({ tokens, title, body, data = {}, userRole = 'customer' }) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.warn('No FCM tokens provided');
      return { success: false, error: 'No FCM tokens provided' };
    }

    const admin = getFirebaseInstance(userRole);
    
    if (!admin) {
      console.error('Firebase not initialized for role:', userRole);
      return { success: false, error: 'Firebase not initialized' };
    }

    const message = {
      tokens: tokens.filter(t => t), // Filter out null/undefined tokens
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const response = await admin.messaging().sendMulticast(message);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('FCM Multicast Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to topic
 * @param {Object} params - Notification parameters
 * @param {string} params.topic - FCM topic
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} params.data - Additional data payload
 * @param {string} params.userRole - User role to determine which Firebase instance to use
 */
const sendToTopic = async ({ topic, title, body, data = {}, userRole = 'customer' }) => {
  try {
    const admin = getFirebaseInstance(userRole);
    
    if (!admin) {
      console.error('Firebase not initialized for role:', userRole);
      return { success: false, error: 'Firebase not initialized' };
    }

    const message = {
      topic,
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('FCM Topic Send Error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
  getFirebaseInstance,
};
