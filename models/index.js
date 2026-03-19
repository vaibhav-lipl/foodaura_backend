const { sequelize } = require('../config/database');
const User = require('./User');
const Restaurant = require('./Restaurant');
const Menu = require('./Menu');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Review = require('./Review');
const Offer = require('./Offer');
const Schedule = require('./Schedule');
const OTP = require('./OTP');
const Address = require('./Address');
const PaymentMethod = require('./PaymentMethod');
const Favorite = require('./Favorite');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Notification = require('./Notification');
const Setting = require('./Setting');
const DeliveryPartnerProfile = require('./DeliveryPartnerProfile');
const DeliveryPartnerVehicle = require('./DeliveryPartnerVehicle');
const DeliveryPartnerDocument = require('./DeliveryPartnerDocument');
const DeliveryPartnerEarning = require('./DeliveryPartnerEarning');
const DeliveryPartnerPayout = require('./DeliveryPartnerPayout');
const DeliveryPartnerPayoutMethod = require('./DeliveryPartnerPayoutMethod');
const DeliveryPartnerSchedule = require('./DeliveryPartnerSchedule');
const DeliveryPartnerLocation = require('./DeliveryPartnerLocation');
const DeliveryPartnerRating = require('./DeliveryPartnerRating');
const FAQModule = require('./FAQModule');
const FAQ = require('./FAQ');
const SupportTicket = require('./SupportTicket');
const SupportTicketMessage = require('./SupportTicketMessage');


// Define associations
User.hasOne(Restaurant, { foreignKey: 'ownerId', as: 'restaurant' });
Restaurant.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Restaurant.hasMany(Menu, { foreignKey: 'restaurantId', as: 'menus' });
Menu.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

Restaurant.hasMany(Order, { foreignKey: 'restaurantId', as: 'orders' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(Menu, { foreignKey: 'menuId', as: 'menu' });

Restaurant.hasMany(Review, { foreignKey: 'restaurantId', as: 'reviews' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

Restaurant.hasMany(Offer, { foreignKey: 'restaurantId', as: 'offers' });
Offer.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

Restaurant.hasMany(Schedule, { foreignKey: 'restaurantId', as: 'schedules' });
Schedule.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// Customer-related associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'customer' });

User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(PaymentMethod, { foreignKey: 'userId', as: 'paymentMethods' });
PaymentMethod.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Favorite.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Favorite.belongsTo(Menu, { foreignKey: 'menuItemId', as: 'menuItem' });

User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Cart.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });
CartItem.belongsTo(Menu, { foreignKey: 'menuItemId', as: 'menuItem' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Delivery Partner associations
User.hasOne(DeliveryPartnerProfile, { foreignKey: 'userId', as: 'deliveryPartnerProfile' });
DeliveryPartnerProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(DeliveryPartnerVehicle, { foreignKey: 'userId', as: 'deliveryPartnerVehicle' });
DeliveryPartnerVehicle.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(DeliveryPartnerDocument, { foreignKey: 'userId', as: 'deliveryPartnerDocuments' });
DeliveryPartnerDocument.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(DeliveryPartnerEarning, { foreignKey: 'userId', as: 'deliveryPartnerEarnings' });
DeliveryPartnerEarning.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DeliveryPartnerEarning.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(DeliveryPartnerPayout, { foreignKey: 'userId', as: 'deliveryPartnerPayouts' });
DeliveryPartnerPayout.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DeliveryPartnerPayout.belongsTo(DeliveryPartnerPayoutMethod, { foreignKey: 'payoutMethodId', as: 'payoutMethod' });

User.hasMany(DeliveryPartnerPayoutMethod, { foreignKey: 'userId', as: 'deliveryPartnerPayoutMethods' });
DeliveryPartnerPayoutMethod.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DeliveryPartnerPayoutMethod.hasMany(DeliveryPartnerPayout, { foreignKey: 'payoutMethodId', as: 'payouts' });

User.hasMany(DeliveryPartnerSchedule, { foreignKey: 'userId', as: 'deliveryPartnerSchedules' });
DeliveryPartnerSchedule.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(DeliveryPartnerLocation, { foreignKey: 'userId', as: 'deliveryPartnerLocations' });
DeliveryPartnerLocation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DeliveryPartnerLocation.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(DeliveryPartnerRating, { foreignKey: 'userId', as: 'deliveryPartnerRatings' });
DeliveryPartnerRating.belongsTo(User, { foreignKey: 'userId', as: 'deliveryPartner' });
DeliveryPartnerRating.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
DeliveryPartnerRating.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Order associations with delivery partner
Order.belongsTo(User, { foreignKey: 'deliveryPartnerId', as: 'deliveryPartner' });
User.hasMany(Order, { foreignKey: 'deliveryPartnerId', as: 'deliveryPartnerOrders' });

// FAQ associations
FAQModule.hasMany(FAQ, { foreignKey: 'moduleId', as: 'faqs' });
FAQ.belongsTo(FAQModule, { foreignKey: 'moduleId', as: 'faqModule' });

// Support ticket associations
User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SupportTicket.hasMany(SupportTicketMessage, { foreignKey: 'ticketId', as: 'messages' });
SupportTicketMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
User.hasMany(SupportTicketMessage, { foreignKey: 'senderId', as: 'supportTicketMessages' });
SupportTicketMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = {
  sequelize,
  User,
  Restaurant,
  Menu,
  Order,
  OrderItem,
  Review,
  Offer,
  Schedule,
  OTP,
  Address,
  PaymentMethod,
  Favorite,
  Cart,
  CartItem,
  Notification,
  Setting,
  DeliveryPartnerProfile,
  DeliveryPartnerVehicle,
  DeliveryPartnerDocument,
  DeliveryPartnerEarning,
  DeliveryPartnerPayout,
  DeliveryPartnerPayoutMethod,
  DeliveryPartnerSchedule,
  DeliveryPartnerLocation,
  DeliveryPartnerRating,
  FAQModule,
  FAQ,
  SupportTicket,
  SupportTicketMessage
};
