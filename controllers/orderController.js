const { Order, OrderItem, Menu, Restaurant, sequelize, User } = require('../models');
const { Op } = require('sequelize');
const { getOrCreateRestaurant } = require('../utils/restaurantHelper');
const { sanitizeString, sanitizeNumber, sanitizeDate } = require('../utils/queryHelper');
const { sendToDevice } = require('../utils/sendNotification');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Sanitize and validate query parameters
    const status = sanitizeString(req.query.status);
    const startDate = sanitizeDate(req.query.startDate);
    const endDate = sanitizeDate(req.query.endDate);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 10);

    let whereClause = {};

    // 🔐 Role-based access control
    if (userRole === 'restaurant') {
      const restaurant = await getOrCreateRestaurant(userId);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      whereClause.restaurantId = restaurant.id;
    }
    else if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    // 🔍 Apply optional filters
    if (status !== null) {
      whereClause.status = status;
    }

    if (startDate !== null || endDate !== null) {
      whereClause.createdAt = {};
      if (startDate !== null) {
        whereClause.createdAt[Op.gte] = startDate;
      }
      if (endDate !== null) {
        whereClause.createdAt[Op.lte] = endDate;
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      distinct: true,
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Menu,
          as: 'menu',
          attributes: ['id', 'name', 'price', 'imageUrl']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      data: { orders }
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    let whereClause = { id };

    // 🔐 Role-based access control
    if (userRole === 'restaurant') {
      const restaurant = await getOrCreateRestaurant(userId);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      whereClause.restaurantId = restaurant.id;
    }
    else if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    const order = await Order.findOne({
      where: whereClause,
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Menu,
          as: 'menu',
          attributes: ['id', 'name', 'price', 'imageUrl', 'category']
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const restaurant = await getOrCreateRestaurant(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const order = await Order.findOne({
      where: {
        id,
        restaurantId: restaurant.id
      },
      include: [{
        model: User,
        as: 'customer',
        attributes: ['id', 'name', 'email', 'fcmToken']
      }],
      include: [{
        model: User,
        as: 'deliveryPartner',
        attributes: ['id', 'name', 'email', 'fcmToken']
      }],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = status;

    // Update payment status if order is delivered
    if (status === 'delivered' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Send notification to customer
    if (order.customer && order.customer.fcmToken) {
      const notificationTitle = `Your order #${order.orderNumber} is now ${status.replace(/_/g, ' ')}`;
      const notificationBody = `The status of your order has been updated to ${status.replace(/_/g, ' ')}.`;

      await sendToDevice({
        token: order.customer.fcmToken,
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: 'order_status_update',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          status: order.status
        },
        userRole: 'customer'
      });
    }

    // If order status is ready, send notification to delivery partners (this is a simplified example, you may want to target specific delivery partners based on location or other criteria)
    if (status === 'ready' && order.deliveryPartner && order.deliveryPartner.fcmToken) {

      await sendToDevice({
        token: order.deliveryPartner.fcmToken,
        title: `Your order #${order.orderNumber} ready for pickup`,
        body: `Order #${order.orderNumber} is ready for pickup at ${restaurant.name}.`,
        data: {
          type: 'new_order_ready',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          restaurantId: restaurant.id.toString()
        },
        userRole: 'delivery_partner'
      });
    }
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

