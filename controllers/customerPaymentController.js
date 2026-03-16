const { PaymentMethod } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * @desc    Get payment methods
 * @route   GET /api/customer/payment-methods
 * @access  Private
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = await PaymentMethod.findAll({
      where: {
        userId: req.user.id,
        isActive: true
      },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          name: pm.name,
          lastFour: pm.lastFour,
          expiryDate: pm.expiryDate,
          isDefault: pm.isDefault
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add payment method
 * @route   POST /api/customer/payment-methods
 * @access  Private
 */
exports.addPaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, name, cardNumber, expiryDate, cvv, cardholderName, isDefault } = req.body;

    // Extract last 4 digits if card number provided
    let lastFour = null;
    if (cardNumber) {
      const cleaned = cardNumber.replace(/\D/g, '');
      lastFour = cleaned.slice(-4);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const paymentMethod = await PaymentMethod.create({
      userId: req.user.id,
      type,
      name: name || type,
      lastFour,
      expiryDate,
      cardholderName,
      isDefault: isDefault || false,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Payment method added successfully',
      data: {
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          name: paymentMethod.name,
          lastFour: paymentMethod.lastFour,
          expiryDate: paymentMethod.expiryDate,
          isDefault: paymentMethod.isDefault
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update payment method
 * @route   PUT /api/customer/payment-methods/:paymentMethodId
 * @access  Private
 */
exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { paymentMethodId } = req.params;
    const { expiryDate, isDefault } = req.body;

    const paymentMethod = await PaymentMethod.findOne({
      where: {
        id: paymentMethodId,
        userId: req.user.id
      }
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId: req.user.id, id: { [Op.ne]: paymentMethodId } } }
      );
    }

    const updateData = {};
    if (expiryDate) updateData.expiryDate = expiryDate;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    await paymentMethod.update(updateData);

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: {
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          name: paymentMethod.name,
          lastFour: paymentMethod.lastFour,
          expiryDate: paymentMethod.expiryDate,
          isDefault: paymentMethod.isDefault
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete payment method
 * @route   DELETE /api/customer/payment-methods/:paymentMethodId
 * @access  Private
 */
exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: {
        id: paymentMethodId,
        userId: req.user.id
      }
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Soft delete
    await paymentMethod.update({ isActive: false });

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default payment method
 * @route   PUT /api/customer/payment-methods/:paymentMethodId/set-default
 * @access  Private
 */
exports.setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: {
        id: paymentMethodId,
        userId: req.user.id
      }
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Unset other defaults
    await PaymentMethod.update(
      { isDefault: false },
      { where: { userId: req.user.id, id: { [Op.ne]: paymentMethodId } } }
    );

    // Set this as default
    await paymentMethod.update({ isDefault: true });

    res.json({
      success: true,
      message: 'Default payment method updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process payment
 * @route   POST /api/customer/payments/process
 * @access  Private
 */
exports.processPayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethodId, amount } = req.body;

    // In a real implementation, integrate with payment gateway
    // For now, just return success

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: `PAY-${Date.now()}`,
        transactionId: `TXN-${Date.now()}`,
        status: 'success',
        amount: parseFloat(amount)
      }
    });
  } catch (error) {
    next(error);
  }
};

