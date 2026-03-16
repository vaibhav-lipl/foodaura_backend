const { DeliveryPartnerEarning, Order, Restaurant, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get Earnings Summary
 * @route   GET /api/captain/earnings/summary
 * @access  Private
 */
exports.getEarningsSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'today', startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = {
        date: {
          [Op.gte]: today.toISOString().split('T')[0]
        }
      };
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = {
        date: {
          [Op.gte]: weekAgo.toISOString().split('T')[0]
        }
      };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = {
        date: {
          [Op.gte]: monthAgo.toISOString().split('T')[0]
        }
      };
    } else if (period === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      dateFilter = {
        date: {
          [Op.gte]: yearAgo.toISOString().split('T')[0]
        }
      };
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = {
        date: {
          [Op.between]: [startDate, endDate]
        }
      };
    }

    const earnings = await DeliveryPartnerEarning.findAll({
      where: {
        userId,
        status: 'credited',
        ...dateFilter
      },
      include: [{
        model: Order,
        as: 'order',
        include: [{
          model: Restaurant,
          as: 'restaurant',
          attributes: ['name']
        }]
      }]
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
    const basePay = earnings.reduce((sum, e) => sum + parseFloat(e.basePay || 0), 0);
    const bonuses = earnings.reduce((sum, e) => sum + parseFloat(e.bonus || 0), 0);
    const tips = earnings.reduce((sum, e) => sum + parseFloat(e.tip || 0), 0);
    const totalDeliveries = earnings.length;
    const averagePerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

    // Group by date for breakdown
    const breakdown = {};
    earnings.forEach(earning => {
      const date = earning.date;
      if (!breakdown[date]) {
        breakdown[date] = {
          date,
          totalEarnings: 0,
          basePay: 0,
          bonuses: 0,
          tips: 0,
          deliveries: 0
        };
      }
      breakdown[date].totalEarnings += parseFloat(earning.total || 0);
      breakdown[date].basePay += parseFloat(earning.basePay || 0);
      breakdown[date].bonuses += parseFloat(earning.bonus || 0);
      breakdown[date].tips += parseFloat(earning.tip || 0);
      breakdown[date].deliveries += 1;
    });

    res.json({
      success: true,
      summary: {
        period,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        basePay: parseFloat(basePay.toFixed(2)),
        bonuses: parseFloat(bonuses.toFixed(2)),
        tips: parseFloat(tips.toFixed(2)),
        currency: 'INR',
        totalDeliveries,
        averagePerDelivery: parseFloat(averagePerDelivery.toFixed(2))
      },
      breakdown: Object.values(breakdown).sort((a, b) => b.date.localeCompare(a.date))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Earnings Breakdown
 * @route   GET /api/captain/earnings/breakdown
 * @access  Private
 */
exports.getEarningsBreakdown = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const whereClause = {
      userId,
      status: 'credited'
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date[Op.gte] = startDate;
      }
      if (endDate) {
        whereClause.date[Op.lte] = endDate;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: earnings } = await DeliveryPartnerEarning.findAndCountAll({
      where: whereClause,
      include: [{
        model: Order,
        as: 'order',
        include: [{
          model: Restaurant,
          as: 'restaurant',
          attributes: ['name']
        }]
      }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const earningsData = earnings.map(earning => ({
      id: earning.id,
      orderId: earning.order?.orderNumber || `ORD-${earning.orderId}`,
      date: earning.date,
      restaurantName: earning.order?.restaurant?.name || 'Unknown',
      basePay: parseFloat(earning.basePay || 0),
      bonus: parseFloat(earning.bonus || 0),
      tip: parseFloat(earning.tip || 0),
      total: parseFloat(earning.total || 0),
      status: earning.status,
      creditedAt: earning.creditedAt
    }));

    res.json({
      success: true,
      earnings: earningsData,
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

/**
 * @desc    Get Earnings Statistics
 * @route   GET /api/captain/earnings/statistics
 * @access  Private
 */
exports.getEarningsStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    const now = new Date();
    let dateFilter = {};

    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = {
        date: {
          [Op.gte]: weekAgo.toISOString().split('T')[0]
        }
      };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = {
        date: {
          [Op.gte]: monthAgo.toISOString().split('T')[0]
        }
      };
    } else if (period === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      dateFilter = {
        date: {
          [Op.gte]: yearAgo.toISOString().split('T')[0]
        }
      };
    }

    const earnings = await DeliveryPartnerEarning.findAll({
      where: {
        userId,
        status: 'credited',
        ...dateFilter
      }
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
    const basePay = earnings.reduce((sum, e) => sum + parseFloat(e.basePay || 0), 0);
    const bonuses = earnings.reduce((sum, e) => sum + parseFloat(e.bonus || 0), 0);
    const tips = earnings.reduce((sum, e) => sum + parseFloat(e.tip || 0), 0);
    const totalDeliveries = earnings.length;
    const averagePerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

    // Find highest earning day
    const dailyEarnings = {};
    earnings.forEach(earning => {
      const date = earning.date;
      if (!dailyEarnings[date]) {
        dailyEarnings[date] = 0;
      }
      dailyEarnings[date] += parseFloat(earning.total || 0);
    });

    let highestEarningDay = null;
    let highestEarning = 0;
    Object.entries(dailyEarnings).forEach(([date, amount]) => {
      if (amount > highestEarning) {
        highestEarning = amount;
        highestEarningDay = { date, earnings: parseFloat(amount.toFixed(2)) };
      }
    });

    const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const averageDaily = totalEarnings / daysInPeriod;

    res.json({
      success: true,
      statistics: {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        averageDaily: parseFloat(averageDaily.toFixed(2)),
        totalDeliveries,
        averagePerDelivery: parseFloat(averagePerDelivery.toFixed(2)),
        highestEarningDay: highestEarningDay || { date: null, earnings: 0 },
        breakdown: {
          basePay: parseFloat(basePay.toFixed(2)),
          bonuses: parseFloat(bonuses.toFixed(2)),
          tips: parseFloat(tips.toFixed(2))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

