const { DeliveryPartnerPayout, DeliveryPartnerPayoutMethod } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get Payout Methods
 * @route   GET /api/captain/payout-methods
 * @access  Private
 */
exports.getPayoutMethods = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payoutMethods = await DeliveryPartnerPayoutMethod.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    const methods = payoutMethods.map(method => ({
      id: method.id,
      type: method.type,
      bankName: method.bankName,
      accountNumber: method.accountNumber ? `****${method.accountNumber.slice(-4)}` : null,
      ifscCode: method.ifscCode,
      accountHolderName: method.accountHolderName,
      upiId: method.upiId,
      isDefault: method.isDefault
    }));

    res.json({
      success: true,
      payoutMethods: methods
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add Payout Method
 * @route   POST /api/captain/payout-methods
 * @access  Private
 */
exports.addPayoutMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, bankName, accountNumber, ifscCode, accountHolderName, upiId, isDefault } = req.body;

    if (!type || !['bank_account', 'upi'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid payout method type is required'
        }
      });
    }

    if (type === 'bank_account') {
      if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Bank account details are required'
          }
        });
      }
    } else if (type === 'upi') {
      if (!upiId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'UPI ID is required'
          }
        });
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await DeliveryPartnerPayoutMethod.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    const payoutMethod = await DeliveryPartnerPayoutMethod.create({
      userId,
      type,
      bankName: type === 'bank_account' ? bankName : null,
      accountNumber: type === 'bank_account' ? accountNumber : null,
      ifscCode: type === 'bank_account' ? ifscCode : null,
      accountHolderName: type === 'bank_account' ? accountHolderName : null,
      upiId: type === 'upi' ? upiId : null,
      isDefault: isDefault || false,
      isVerified: false
    });

    res.json({
      success: true,
      message: 'Payout method added successfully',
      payoutMethod: {
        id: payoutMethod.id,
        type: payoutMethod.type,
        bankName: payoutMethod.bankName,
        accountNumber: payoutMethod.accountNumber ? `****${payoutMethod.accountNumber.slice(-4)}` : null,
        isDefault: payoutMethod.isDefault
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Payout Method
 * @route   PUT /api/captain/payout-methods/:payoutMethodId
 * @access  Private
 */
exports.updatePayoutMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { payoutMethodId } = req.params;
    const { isDefault } = req.body;

    const payoutMethod = await DeliveryPartnerPayoutMethod.findOne({
      where: { id: payoutMethodId, userId }
    });

    if (!payoutMethod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payout method not found'
        }
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await DeliveryPartnerPayoutMethod.update(
        { isDefault: false },
        { where: { userId, id: { [Op.ne]: payoutMethodId } } }
      );
    }

    await payoutMethod.update({ isDefault: isDefault || false });

    res.json({
      success: true,
      message: 'Payout method updated successfully',
      payoutMethod: {
        id: payoutMethod.id,
        type: payoutMethod.type,
        isDefault: payoutMethod.isDefault
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Payout Method
 * @route   DELETE /api/captain/payout-methods/:payoutMethodId
 * @access  Private
 */
exports.deletePayoutMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { payoutMethodId } = req.params;

    const payoutMethod = await DeliveryPartnerPayoutMethod.findOne({
      where: { id: payoutMethodId, userId }
    });

    if (!payoutMethod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payout method not found'
        }
      });
    }

    await payoutMethod.destroy();

    res.json({
      success: true,
      message: 'Payout method deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request Payout
 * @route   POST /api/captain/payouts/request
 * @access  Private
 */
exports.requestPayout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, payoutMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid amount is required'
        }
      });
    }

    const payoutMethod = await DeliveryPartnerPayoutMethod.findOne({
      where: { id: payoutMethodId, userId }
    });

    if (!payoutMethod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payout method not found'
        }
      });
    }

    const payout = await DeliveryPartnerPayout.create({
      userId,
      payoutMethodId,
      amount: parseFloat(amount),
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout: {
        id: payout.id,
        amount: parseFloat(payout.amount),
        status: payout.status,
        requestedAt: payout.requestedAt,
        estimatedProcessingTime: '1-2 business days'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Payout History
 * @route   GET /api/captain/payouts
 * @access  Private
 */
exports.getPayoutHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: payouts } = await DeliveryPartnerPayout.findAndCountAll({
      where: whereClause,
      include: [{
        model: DeliveryPartnerPayoutMethod,
        as: 'payoutMethod',
        attributes: ['type', 'bankName', 'accountNumber', 'upiId']
      }],
      order: [['requestedAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const payoutsData = payouts.map(payout => {
      const method = payout.payoutMethod;
      let methodDisplay = '';
      if (method.type === 'bank_account') {
        methodDisplay = `${method.bankName} ****${method.accountNumber?.slice(-4) || ''}`;
      } else if (method.type === 'upi') {
        methodDisplay = method.upiId;
      }

      return {
        id: payout.id,
        amount: parseFloat(payout.amount),
        status: payout.status,
        payoutMethod: methodDisplay,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        transactionId: payout.transactionId
      };
    });

    res.json({
      success: true,
      payouts: payoutsData,
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

