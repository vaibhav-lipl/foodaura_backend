const { Order, OrderItem, Menu, Restaurant, User, DeliveryPartnerProfile, DeliveryPartnerEarning, DeliveryPartnerLocation, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');
const { getLatLonFromAddress } = require('../utils/geocoding');
const { sendToDevice } = require('../utils/sendNotification');

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * @desc    Get Available Deliveries
 * @route   GET /api/captain/deliveries/available
 * @access  Private
 */
exports.getAvailableDeliveries = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        }
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusMeters = parseInt(radius);

    // Get orders that are ready for delivery (status: 'ready')
    const orders = await Order.findAll({
      where: {
        status: 'confirmed',
        deliveryPartnerId: null
      },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'city', 'state', 'zipCode', 'phone', 'latitude', 'longitude']
      }],
      order: [['createdAt', 'ASC']]
    });


    // Filter orders by distance and format response
    const availableDeliveries = [];

    for (const order of orders) {
      if (order.restaurant && (!order.restaurant.latitude || !order.restaurant.longitude)) {
        const address = order.restaurant.address + ', ' + order.restaurant.city + ',' + order.restaurant.state + ' ' + order.restaurant.zipCode;
        const geocode = await getLatLonFromAddress(address);
        order.restaurant.latitude = geocode.lat;
        order.restaurant.longitude = geocode.lon;
        await order.restaurant.save();
      }
      if (order.restaurant && order.restaurant.latitude && order.restaurant.longitude) {
        const restaurantLat = parseFloat(order.restaurant.latitude);
        const restaurantLng = parseFloat(order.restaurant.longitude);

        // Calculate distance from captain's location to restaurant
        const distance = calculateDistance(lat, lng, restaurantLat, restaurantLng);

        if (distance <= radiusMeters) {
          // Calculate distance from restaurant to customer
          const customerLat = parseFloat(order.customerLatLon?.split(',')[0]) || lat;
          const customerLng = parseFloat(order.customerLatLon?.split(',')[1]) || lng;
          const deliveryDistance = calculateDistance(restaurantLat, restaurantLng, customerLat, customerLng);

          // Get order items count
          const itemsCount = await OrderItem.count({ where: { orderId: order.id } });

          // Calculate payout (simplified - you may want to use actual delivery fee)
          const payoutAmount = Math.max(30, Math.round(deliveryDistance / 100)); // Minimum ₹30, ₹1 per 100m

          availableDeliveries.push({
            id: order.id,
            orderId: order.orderNumber,
            restaurantId: order.restaurantId,
            restaurantName: order.restaurant.name,
            restaurantAddress: order.restaurant.address,
            restaurantPhone: order.restaurant.phone,
            restaurantLat: restaurantLat,
            restaurantLng: restaurantLng,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            deliveryAddress: order.customerAddress,
            deliveryLat: customerLat,
            deliveryLng: customerLng,
            distance: `${(deliveryDistance / 1000).toFixed(1)} km`,
            estimatedPickupTime: '5-10 min',
            estimatedDeliveryTime: '25-30 min',
            payout: `₹${payoutAmount}`,
            payoutAmount: payoutAmount,
            itemsCount: itemsCount,
            createdAt: order.createdAt
          });
        }
      }
    }

    res.json({
      success: true,
      deliveries: availableDeliveries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept Delivery
 * @route   POST /api/captain/deliveries/:deliveryId/accept
 * @access  Private
 */
exports.acceptDelivery = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { deliveryId } = req.params;
    const { latitude, longitude } = req.body;

    // Check if captain has active delivery
    const activeDelivery = await Order.findOne({
      where: {
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['assigned', 'ready', 'picked_up', 'in_transit']
        }
      }
    });

    if (activeDelivery) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_ASSIGNED',
          message: 'You already have an active delivery'
        }
      });
    }

    const order = await Order.findOne({
      where: {
        id: deliveryId,
        status: 'confirmed',
        deliveryPartnerId: null
      },
      include: [{
        model: Restaurant,
        as: 'restaurant'
      }],
      include: [{
        model: User,
        as: 'customer'
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Delivery not available'
        }
      });
    }

    // Generate delivery OTP
    const deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString();

    // Update order
    await order.update({
      deliveryPartnerId: userId,
      status: 'assigned',
      deliveryOTP: deliveryOTP
    });

    // Update captain's location if provided
    if (latitude && longitude) {
      await DeliveryPartnerLocation.create({
        userId,
        orderId: order.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date()
      });

      // Update profile location
      const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
      if (profile) {
        await profile.update({
          currentLatitude: parseFloat(latitude),
          currentLongitude: parseFloat(longitude),
          lastLocationUpdate: new Date()
        });
      }
    }

    const estimatedPickupTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Send notifications
    // Notify restaurant (web Firebase)
    if (order.restaurant) {
      const restaurantOwner = await User.findByPk(order.restaurant.ownerId);
      if (restaurantOwner && restaurantOwner.fcmToken) {
        await sendToDevice({
          token: restaurantOwner.fcmToken,
          title: 'Delivery Partner Assigned',
          body: `A delivery partner has been assigned to order #${order.orderNumber}`,
          data: {
            type: 'delivery_assigned',
            orderId: order.id.toString(),
            orderNumber: order.orderNumber,
          },
          userRole: 'restaurant'
        });
      }
    }

    // Notify customer (mobile Firebase)
    const customer = await User.findByPk(order.userId);
    if (customer && customer.fcmToken) {
      await sendToDevice({
        token: customer.fcmToken,
        title: 'Order Assigned',
        body: `Your order #${order.orderNumber} has been assigned to a delivery partner`,
        data: {
          type: 'order_assigned',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
        userRole: 'customer'
      });
    }

    res.json({
      success: true,
      message: 'Delivery accepted successfully',
      order: {
        orderId: order.orderNumber,
        status: 'assigned',
        estimatedPickupTime: estimatedPickupTime.toISOString(),
        estimatedDeliveryTime: estimatedDeliveryTime.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Active Deliveries
 * @route   GET /api/captain/deliveries/active
 * @access  Private
 */
exports.getActiveDeliveries = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const orders = await Order.findAll({
      where: {
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['assigned', 'ready', 'picked_up', 'in_transit']
        }
      },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    const deliveries = orders.map(order => {
      // Calculate payout
      const payoutAmount = Math.max(30, Math.round((order.deliveryFee || 0) * 100));

      return {
        id: order.id,
        orderId: order.orderNumber,
        restaurantName: order.restaurant?.name || 'Unknown',
        customerName: order.customerName,
        status: order.status,
        estimatedDeliveryTime: order.deliveredAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payout: `₹${payoutAmount}`
      };
    });

    res.json({
      success: true,
      deliveries: deliveries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Order Details
 * @route   GET /api/captain/orders/:orderId
 * @access  Private
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Menu,
            as: 'menu',
            attributes: ['id', 'name', 'price', 'imageUrl']
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Format items
    const items = order.items.map(item => ({
      id: item.id,
      name: item.menu?.name || 'Unknown',
      quantity: item.quantity,
      price: parseFloat(item.price),
      specialInstructions: item.specialInstructions || null
    }));

    // Calculate distance
    let distance = '0 km';
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      const restaurantLat = parseFloat(order.restaurant.latitude);
      const restaurantLng = parseFloat(order.restaurant.longitude);
      // Parse customer address coordinates if available
      const customerCoords = order.customerAddress?.split(',').map(Number).filter(n => !isNaN(n));
      if (customerCoords && customerCoords.length >= 2) {
        const distanceMeters = calculateDistance(restaurantLat, restaurantLng, customerCoords[0], customerCoords[1]);
        distance = `${(distanceMeters / 1000).toFixed(1)} km`;
      }
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderNumber,
        status: order.status,
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
          address: order.restaurant.address,
          phone: order.restaurant.phone,
          latitude: parseFloat(order.restaurant.latitude) || null,
          longitude: parseFloat(order.restaurant.longitude) || null
        },
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          address: order.customerAddress,
          latitude: null, // You may need to store this separately
          longitude: null
        },
        items: items,
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          subtotal: parseFloat(order.subtotal),
          deliveryFee: parseFloat(order.deliveryFee),
          tax: parseFloat(order.tax),
          total: parseFloat(order.total)
        },
        timing: {
          estimatedPickupTime: order.pickedUpAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          estimatedDeliveryTime: order.deliveredAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          pickedUpAt: order.pickedUpAt,
          deliveredAt: order.deliveredAt
        },
        payout: {
          amount: Math.max(30, Math.round(parseFloat(order.deliveryFee) * 100)),
          currency: 'INR'
        },
        distance: distance,
        deliveryInstruction: order.deliveryInstruction || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Order Status - Pickup
 * @route   PUT /api/captain/orders/:orderId/pickup
 * @access  Private
 */
exports.pickupOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { latitude, longitude, timestamp } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['assigned', 'ready']
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found or not in ready or assigned status'
        }
      });
    }

    const pickupTime = timestamp ? new Date(timestamp) : new Date();

    await order.update({
      status: 'picked_up',
      pickedUpAt: pickupTime
    });

    // Update location if provided
    if (latitude && longitude) {
      await DeliveryPartnerLocation.create({
        userId,
        orderId: order.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: pickupTime
      });
    }

    // Send notification to customer (mobile Firebase)
    const customer = await User.findByPk(order.userId);
    if (customer && customer.fcmToken) {
      await sendToDevice({
        token: customer.fcmToken,
        title: 'Order Picked Up',
        body: `Your order #${order.orderNumber} has been picked up and is on the way`,
        data: {
          type: 'order_picked_up',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
        userRole: 'customer'
      });
    }

    res.json({
      success: true,
      message: 'Order picked up successfully',
      order: {
        orderId: order.orderNumber,
        status: 'picked_up',
        pickedUpAt: pickupTime.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Order Status - In Transit
 * @route   PUT /api/captain/orders/:orderId/in-transit
 * @access  Private
 */
exports.updateInTransit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { latitude, longitude, timestamp } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['picked_up', 'in_transit']
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    await order.update({
      status: 'in_transit'
    });

    // Update location if provided
    if (latitude && longitude) {
      await DeliveryPartnerLocation.create({
        userId,
        orderId: order.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });
    }

    res.json({
      success: true,
      message: 'Order status updated to in-transit',
      order: {
        orderId: order.orderNumber,
        status: 'in_transit'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete Delivery
 * @route   PUT /api/captain/orders/:orderId/deliver
 * @access  Private
 */
exports.completeDelivery = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { latitude, longitude, timestamp, otp, signature, deliveryNotes } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['picked_up', 'in_transit']
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Verify OTP if required
    if (order.deliveryOTP && otp && order.deliveryOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid delivery OTP'
        }
      });
    }

    const deliveryTime = timestamp ? new Date(timestamp) : new Date();

    // Update order
    await order.update({
      status: 'delivered',
      deliveredAt: deliveryTime,
      paymentStatus: order.paymentStatus === 'pending' ? 'paid' : order.paymentStatus
    });

    // Update location
    if (latitude && longitude) {
      await DeliveryPartnerLocation.create({
        userId,
        orderId: order.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: deliveryTime
      });
    }

    // Create earning record
    const payoutAmount = Math.max(30, Math.round(parseFloat(order.deliveryFee) * 100));
    await DeliveryPartnerEarning.create({
      userId,
      orderId: order.id,
      basePay: payoutAmount / 100,
      bonus: 0,
      tip: 0,
      total: payoutAmount / 100,
      status: 'credited',
      creditedAt: deliveryTime,
      date: deliveryTime.toISOString().split('T')[0]
    });

    // Update profile stats
    const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
    if (profile) {
      await profile.update({
        totalDeliveries: (profile.totalDeliveries || 0) + 1
      });
    }

    // Send notifications
    // Notify customer (mobile Firebase)
    const customer = await User.findByPk(order.userId);
    if (customer && customer.fcmToken) {
      await sendToDevice({
        token: customer.fcmToken,
        title: 'Order Delivered!',
        body: `Your order #${order.orderNumber} has been delivered successfully`,
        data: {
          type: 'order_delivered',
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
        userRole: 'customer'
      });
    }

    // Notify restaurant (web Firebase)
    const restaurant = await Restaurant.findByPk(order.restaurantId);
    if (restaurant) {
      const restaurantOwner = await User.findByPk(restaurant.ownerId);
      if (restaurantOwner && restaurantOwner.fcmToken) {
        await sendToDevice({
          token: restaurantOwner.fcmToken,
          title: 'Order Delivered',
          body: `Order #${order.orderNumber} has been delivered successfully`,
          data: {
            type: 'order_delivered',
            orderId: order.id.toString(),
            orderNumber: order.orderNumber,
          },
          userRole: 'restaurant'
        });
      }
    }

    res.json({
      success: true,
      message: 'Order delivered successfully',
      order: {
        orderId: order.orderNumber,
        status: 'delivered',
        deliveredAt: deliveryTime.toISOString(),
        payout: {
          amount: payoutAmount / 100,
          currency: 'INR',
          creditedAt: deliveryTime.toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel Delivery (by captain)
 * @route   POST /api/captain/orders/:orderId/cancel
 * @access  Private
 */
exports.cancelDelivery = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason, description } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        deliveryPartnerId: userId,
        status: {
          [Op.in]: ['assigned', 'picked_up']
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Update order - remove delivery partner assignment
    await order.update({
      deliveryPartnerId: null,
      status: 'ready', // Make it available again
      notes: `Cancelled by delivery partner: ${reason}. ${description || ''}`
    });

    res.json({
      success: true,
      message: 'Delivery cancelled',
      order: {
        orderId: order.orderNumber,
        status: 'ready'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Delivery History
 * @route   GET /api/captain/deliveries/history
 * @access  Private
 */
exports.getDeliveryHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;

    const whereClause = {
      deliveryPartnerId: userId,
      status: {
        [Op.in]: ['delivered', 'cancelled']
      }
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const deliveries = orders.map(order => {
      const payoutAmount = Math.max(30, Math.round(parseFloat(order.deliveryFee) * 100));
      return {
        id: order.id,
        orderId: order.orderNumber,
        restaurantName: order.restaurant?.name || 'Unknown',
        customerName: order.customerName,
        status: order.status,
        payout: `₹${payoutAmount / 100}`,
        completedAt: order.deliveredAt || order.updatedAt
      };
    });

    res.json({
      success: true,
      deliveries: deliveries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

