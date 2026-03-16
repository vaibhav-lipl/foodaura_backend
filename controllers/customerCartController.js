const { Cart, CartItem, Menu, Restaurant, Setting } = require('../models');
const { Op } = require('sequelize');
const { getImageUrl } = require('../middleware/upload');

// Helper to get or create cart
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ where: { userId } });
  if (!cart) {
    cart = await Cart.create({ userId });
  }
  return cart;
};

// Calculate cart totals
const calculateCartTotals = async (cartId) => {
  const cartItems = await CartItem.findAll({
    where: { cartId },
    include: [{ model: Menu, as: 'menuItem' }]
  });

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity);
  }, 0);

  const deliveryFee = 30; // Fixed delivery fee
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + deliveryFee + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    deliveryFee,
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

/**
 * @desc    Get cart
 * @route   GET /api/customer/cart
 * @access  Private
 */
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Menu,
          as: 'menuItem',
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              required: false
            }
          ]
        }
      ]
    });

    const totals = await calculateCartTotals(cart.id);

    const formattedItems = cartItems.map(item => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      price: parseFloat(item.price),
      quantity: item.quantity,
      image: item.menuItem.imageUrl ? getImageUrl(item.menuItem.imageUrl, 'menu') : null,
      restaurantId: item.menuItem.restaurantId,
      restaurantName: item.menuItem.restaurant?.name || 'Unknown'
    }));

    res.json({
      success: true,
      data: {
        items: formattedItems,
        summary: totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/customer/cart/items
 * @access  Private
 */
exports.addToCart = async (req, res, next) => {
  try {
    const { menuItemId, quantity = 1, restaurantId, specialInstructions } = req.body;

    // Validate menu item
    const menuItem = await Menu.findByPk(menuItemId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!menuItem || !menuItem.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or unavailable'
      });
    }

    // Get or create cart
    const cart = await getOrCreateCart(req.user.id);

    // Check if cart already has items from different restaurant
    if (cart.restaurantId && cart.restaurantId !== menuItem.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Cart already contains items from another restaurant. Please clear cart first.'
      });
    }

    // Update cart restaurant
    if (!cart.restaurantId) {
      await cart.update({ restaurantId: menuItem.restaurantId });
    }

    // Check if item already in cart
    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        menuItemId
      }
    });

    if (existingItem) {
      // Update quantity
      await existingItem.update({
        quantity: existingItem.quantity + quantity,
        specialInstructions: specialInstructions || existingItem.specialInstructions
      });
    } else {
      // Add new item
      await CartItem.create({
        cartId: cart.id,
        menuItemId,
        quantity,
        price: menuItem.price,
        specialInstructions
      });
    }

    const updatedItem = await CartItem.findOne({
      where: { cartId: cart.id, menuItemId },
      include: [{ model: Menu, as: 'menuItem' }]
    });

    const totals = await calculateCartTotals(cart.id);

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        cartItem: {
          id: updatedItem.id,
          menuItemId: updatedItem.menuItemId,
          name: updatedItem.menuItem.name,
          price: parseFloat(updatedItem.price),
          quantity: updatedItem.quantity
        },
        cartSummary: totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/customer/cart/items/:cartItemId
 * @access  Private
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await getOrCreateCart(req.user.id);
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
        cartId: cart.id
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.update({ quantity });

    const totals = await calculateCartTotals(cart.id);

    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        cartItem: {
          id: cartItem.id,
          quantity: cartItem.quantity
        },
        cartSummary: totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/customer/cart/items/:cartItemId
 * @access  Private
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;

    const cart = await getOrCreateCart(req.user.id);
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
        cartId: cart.id
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.destroy();

    // Check if cart is empty, reset restaurantId
    const remainingItems = await CartItem.count({ where: { cartId: cart.id } });
    if (remainingItems === 0) {
      await cart.update({ restaurantId: null });
    }

    const totals = await calculateCartTotals(cart.id);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cartSummary: totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/customer/cart
 * @access  Private
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    await CartItem.destroy({ where: { cartId: cart.id } });
    await cart.update({ restaurantId: null });

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Calculate cart totals
 * @route   POST /api/customer/cart/calculate
 * @access  Private
 */
exports.calculateCart = async (req, res, next) => {
  try {
    const { items, deliveryAddressId, promoCode } = req.body;

    // If items provided, calculate from those, otherwise use cart
    let subtotal = 0;
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.price || 0) * (item.quantity || 1));
      }, 0);
    } else {
      const cart = await getOrCreateCart(req.user.id);
      const totals = await calculateCartTotals(cart.id);
      subtotal = totals.subtotal;
    }

    // Fetch settings
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(500).json({
        success: false,
        message: 'Settings not found'
      });
    }

    // Use settings for delivery and tax
    const deliveryFee = settings.deliveryCharge;
    const tax = subtotal * (settings.taxPercent / 100);
    let discount = 0;

    // Apply promo code if provided
    if (promoCode) {
      const { Offer } = require('../models');
      const offer = await Offer.findOne({
        where: {
          code: promoCode,
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });

      if (offer) {
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

    const total = subtotal + deliveryFee + tax - discount;

    res.json({
      success: true,
      data: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        deliveryFee,
        tax: parseFloat(tax.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        estimatedDeliveryTime: '30-45 min'
      }
    });
  } catch (error) {
    next(error);
  }
};

