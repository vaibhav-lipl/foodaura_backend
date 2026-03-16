const { Order, OrderItem, Cart, CartItem, Menu, Restaurant, Address, PaymentMethod, Offer, User, Setting, DeliveryPartnerVehicle, DeliveryPartnerProfile, DeliveryPartnerLocation } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');
const { sanitizeString, sanitizeNumber, sanitizeDate } = require('../utils/queryHelper');
const { sendToDevice } = require('../utils/sendNotification');
const { Notification } = require('../models');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

/**
 * @desc    Create order
 * @route   POST /api/customer/orders
 * @access  Private
 */
exports.createOrder = async (req, res, next) => {
  try {
    const {
      restaurantId,
      items,
      deliveryAddressId,
      paymentMethodId,
      promoCode,
      deliveryInstructions
    } = req.body;

    // Fetch settings
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(500).json({
        success: false,
        message: 'Settings not found'
      });
    }

    if (!settings.isOrderEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Orders are currently disabled'
      });
    }

    // Validate restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (!restaurant.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant is currently closed'
      });
    }

    // Get user info
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get delivery address
    const address = await Address.findByPk(deliveryAddressId, {
      where: { userId: req.user.id }
    });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

    // Get payment method
    let paymentMethod = 'cash';
    if (paymentMethodId) {
      const payment = await PaymentMethod.findByPk(paymentMethodId, {
        where: { userId: req.user.id }
      });
      if (payment) {
        paymentMethod = payment.type.toLowerCase();
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    // Use items from request or cart
    let itemsToProcess = items;
    if (!itemsToProcess || itemsToProcess.length === 0) {
      // Get from cart
      const cart = await Cart.findOne({ where: { userId: req.user.id } });
      if (!cart || cart.restaurantId !== restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty or contains items from different restaurant'
        });
      }

      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [{ model: Menu, as: 'menuItem' }]
      });

      itemsToProcess = cartItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions
      }));
    }

    // Process items
    for (const item of itemsToProcess) {
      const menuItem = await Menu.findOne({
        where: {
          id: item.menuItemId,
          restaurantId: restaurantId
        }
      });
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item ${item.menuItemId} not found or unavailable`
        });
      }

      const itemPrice = parseFloat(menuItem.price);
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        menuId: item.menuItemId,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions
      });
    }

    // Check min order amount
    if (subtotal < settings.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${settings.minOrderAmount}`
      });
    }

    // Apply promo code
    let discount = 0;
    if (promoCode) {
      const offer = await Offer.findOne({
        where: {
          code: promoCode,
          restaurantId,
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });
      if (offer && subtotal >= parseFloat(offer.minOrderAmount || 0)) {
        if (offer.discountType === 'percentage') {
          discount = subtotal * (parseFloat(offer.discountValue) / 100);
          if (offer.maxDiscount) {
            discount = Math.min(discount, parseFloat(offer.maxDiscount));
          }
        } else {
          discount = parseFloat(offer.discountValue);
        }
      }
    }

    // Use settings for delivery and tax
    const deliveryFee = settings.deliveryCharge;
    const tax = subtotal * (settings.taxPercent / 100);
    const total = subtotal + deliveryFee + tax - discount;

    // const deliveryFee = 30;
    // const tax = subtotal * 0.05;
    // const total = subtotal + deliveryFee + tax - discount;

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      restaurantId,
      orderNumber: generateOrderNumber(),
      customerName: user.name,
      customerPhone: user.phone,
      customerAddress: `${address.address}, ${address.city}, ${address.state} ${address.zipCode}`,
      customerLatLon: `${address.latitude},${address.longitude}`,
      status: 'pending',
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      deliveryFee,
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
      notes: deliveryInstructions
    });

    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        menuId: item.menuId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        specialInstructions: item.specialInstructions
      });
    }

    // Clear cart
    const cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id } });
      await cart.update({ restaurantId: null });
    }
    // Send notification to restaurant owner (use web Firebase - appfirebase.js)
    const restaurantOwner = await User.findByPk(restaurant.ownerId);
    if (restaurantOwner && restaurantOwner.fcmToken) {
      await sendToDevice({
        token: restaurantOwner.fcmToken,
        title: "New Order Received!",
        body: `You have a new order of Rs. ${order.total}. Check now.`,
        data: {
          type: 'new_order',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
        userRole: 'restaurant' // Use web Firebase for restaurant
      });
    }

    // Send notification to customer
    if (user.fcmToken) {
      await sendToDevice({
        token: user.fcmToken,
        title: "Order Placed Successfully!",
        body: `Your order of Rs. ${order.total} has been placed successfully. Order number: ${order.orderNumber}.`,
        data: {
          type: 'order_confirmation',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
        userRole: 'customer'
      });
    }

    //Save Notification in DB for restaurant owner and admin and customer
    await Notification.create({
      userId: restaurant.ownerId,
      title: "New Order Received!",
      message: `You have a new order of Rs. ${order.total}. Check now.`,
      type: 'order',
      orderId: order.id,
      actionUrl: `/restaurant/orders/${order.id}`,
      isRead: false,
    })
    await Notification.create({
      userId: req.user.id,
      title: "Order Placed Successfully!",
      message: `Your order of Rs. ${order.total} has been placed successfully. Order number: ${order.orderNumber}.`,
      type: 'order',
      orderId: order.id,
      actionUrl: `/customer/orders/${order.id}`,
      isRead: false,
    })

    res.json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedDeliveryTime: '30-45 min',
        total: parseFloat(order.total)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get orders list
 * @route   GET /api/customer/orders
 * @access  Private
 */
exports.getOrders = async (req, res, next) => {
  try {
    const status = sanitizeString(req.query.status);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 20);

    const whereClause = { userId: req.user.id };
    if (status !== null) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'imageUrl']
        },
        {
          model: OrderItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      restaurant: order.restaurant?.name || 'Unknown',
      restaurantId: order.restaurantId,
      date: order.createdAt.toISOString(),
      status: order.status,
      items: order.items?.length || 0,
      total: parseFloat(order.total),
      deliveryAddress: order.customerAddress
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order details
 * @route   GET /api/customer/orders/:orderId
 * @access  Private
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'imageUrl']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Menu,
              as: 'menu',
              attributes: ['id', 'name', 'price', 'imageUrl', 'preparationTime']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Parse address
    const addressParts = order.customerAddress.split(', ');
    const deliveryAddress = {
      address: addressParts[0] || '',
      city: addressParts[1] || '',
      state: addressParts[2] || '',
      zipCode: ''
    };

    // --- Calculate dynamic estimated delivery time ---

    const prepTimes = order.items
      .map(item => item.menu?.preparationTime || 0);

    const maxPrepTime = prepTimes.length ? Math.max(...prepTimes) : 0;

    // Additional buffers (in minutes)
    const PACKAGING_TIME = 5;
    const DELIVERY_TIME = 15;

    const estimatedMinutes =
      maxPrepTime + PACKAGING_TIME + DELIVERY_TIME;

    // Delivery window
    const minTime = estimatedMinutes - 5;
    const maxTime = estimatedMinutes + 5;

    const estimatedDeliveryTime = `${minTime}-${maxTime} min`;

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
          image: order.restaurant.imageUrl ? getImageUrl(order.restaurant.imageUrl, 'restaurant') : null
        },
        date: order.createdAt.toISOString(),
        status: order.status,
        items: order.items.map(item => ({
          id: item.id,
          name: item.menu?.name || 'Unknown',
          quantity: item.quantity,
          price: parseFloat(item.price),
          image: item.menu?.imageUrl ? getImageUrl(item.menu.imageUrl, 'menu') : null
        })),
        deliveryAddress,
        paymentMethod: {
          type: order.paymentMethod,
          name: order.paymentMethod === 'cash' ? 'Cash on Delivery' : order.paymentMethod
        },
        summary: {
          subtotal: parseFloat(order.subtotal),
          deliveryFee: parseFloat(order.deliveryFee),
          tax: parseFloat(order.tax),
          discount: parseFloat(order.discount),
          total: parseFloat(order.total)
        },
        tracking: {
          estimatedDeliveryTime,
          currentStatus: order.status,
          statusHistory: [
            { status: 'pending', timestamp: order.createdAt.toISOString(), message: 'Order placed' }
          ]
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order history
 * @route   GET /api/customer/orders/history
 * @access  Private
 */
exports.getOrderHistory = async (req, res, next) => {
  try {
    const startDate = sanitizeDate(req.query.startDate);
    const endDate = sanitizeDate(req.query.endDate);
    const page = sanitizeNumber(req.query.page, 1);
    const limit = sanitizeNumber(req.query.limit, 20);

    const whereClause = { userId: req.user.id };
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = startDate;
      if (endDate) whereClause.createdAt[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'imageUrl']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Menu,
              as: 'menu',
              attributes: ['id', 'name', 'price', 'imageUrl']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          restaurant: order.restaurant?.name,
          restaurantImage: order.restaurant?.imageUrl ? getImageUrl(order.restaurant.imageUrl, 'restaurant') : null,
          date: order.createdAt.toISOString(),
          status: order.status,
          subtotal: parseFloat(order.subtotal),
          tax: parseFloat(order.tax),
          deliveryFee: parseFloat(order.deliveryFee),
          discount: parseFloat(order.discount),
          total: parseFloat(order.total),
          items: order.items.map(item => ({
            id: item.id,
            name: item.menu?.name || 'Unknown',
            quantity: item.quantity,
            price: parseFloat(item.price)
          }))
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   POST /api/customer/orders/:orderId/cancel
 * @access  Private
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow cancellation if order is pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    await order.update({
      status: 'cancelled',
      notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}`.trim() : order.notes
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order.id,
        status: 'Cancelled',
        refundAmount: order.paymentStatus === 'paid' ? parseFloat(order.total) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track order
 * @route   GET /api/customer/orders/:orderId/track
 * @access  Private
 */
exports.trackOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'deliveryPartner',
          attributes: ['id', 'name', 'phone'],
          include: [
            {
              model: DeliveryPartnerProfile,
              as: 'deliveryPartnerProfile'
            },
            {
              model: DeliveryPartnerVehicle,
              as: 'deliveryPartnerVehicle'
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Build status history
    const statusHistory = [
      {
        status: 'pending',
        timestamp: order.createdAt.toISOString(),
        message: 'Order placed'
      }
    ];

    if (order.status !== 'pending') {
      statusHistory.push({
        status: order.status,
        timestamp: order.updatedAt.toISOString(),
        message: `Order ${order.status}`
      });
    }
    let latitude = null;
    let longitude = null;

    if (order.customerLatLon) {
      const coords = order.customerLatLon.split(',');
      if (coords.length === 2) {
        latitude = parseFloat(coords[0].trim());
        longitude = parseFloat(coords[1].trim());
      }
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        orderLat: latitude,
        orderLon: longitude,
        otp: order.deliveryOTP || null,
        estimatedDeliveryTime: '30-45 min',
        currentStatus: order.status,
        statusHistory,

        deliveryPartner: order.deliveryPartner
          ? {
            id: order.deliveryPartner.id,
            name: order.deliveryPartner.name,
            phone: order.deliveryPartner.phone,
            vehicle: order.deliveryPartner.deliveryPartnerVehicle
              ? {
                type: order.deliveryPartner.deliveryPartnerVehicle.type,
                make: order.deliveryPartner.deliveryPartnerVehicle.make,
                model: order.deliveryPartner.deliveryPartnerVehicle.model,
                number: order.deliveryPartner.deliveryPartnerVehicle.registrationNumber
              }
              : null
          }
          : null
      }
    });

  } catch (error) {
    next(error);
  }
};

/********************
 * Additional functions for delivery partner location tracking can be added here
 ********************/

exports.getDeliveryPartnersCurrentLocation = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const currentLocation = await DeliveryPartnerLocation.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']] // 🔥 latest record
    });

    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner location not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: currentLocation.userId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        updatedAt: currentLocation.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};
