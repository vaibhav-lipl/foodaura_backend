const { DeliveryPartnerSchedule, DeliveryPartnerProfile } = require('../models');

/**
 * @desc    Get Schedule
 * @route   GET /api/captain/schedule
 * @access  Private
 */
exports.getSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const schedules = await DeliveryPartnerSchedule.findAll({
      where: { userId },
      order: [['day', 'ASC']]
    });

    // Group by day
    const scheduleByDay = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const daySchedules = schedules.filter(s => s.day === day);
      scheduleByDay[day] = {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        date: null, // You may want to calculate actual dates
        isAvailable: daySchedules.length > 0 && daySchedules.some(s => s.isAvailable),
        shifts: daySchedules.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status
        }))
      };
    });

    res.json({
      success: true,
      schedule: Object.values(scheduleByDay)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Availability
 * @route   PUT /api/captain/schedule/availability
 * @access  Private
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isAvailable, recurringSchedule } = req.body;

    // Update profile availability status
    const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
    if (profile && isAvailable !== undefined) {
      await profile.update({ isOnline: isAvailable });
    }

    // Update recurring schedule if provided
    if (recurringSchedule) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const day of days) {
        if (recurringSchedule[day]) {
          const daySchedule = recurringSchedule[day];
          
          // Delete existing schedules for this day
          await DeliveryPartnerSchedule.destroy({
            where: { userId, day }
          });

          // Create new schedules
          if (daySchedule.available && daySchedule.shifts) {
            for (const shift of daySchedule.shifts) {
              await DeliveryPartnerSchedule.create({
                userId,
                day,
                isAvailable: true,
                startTime: shift.startTime,
                endTime: shift.endTime,
                status: 'scheduled'
              });
            }
          }
        }
      }
    }

    // Get updated schedule
    const schedules = await DeliveryPartnerSchedule.findAll({
      where: { userId },
      order: [['day', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Availability updated successfully',
      schedule: schedules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Online/Offline Status
 * @route   PUT /api/captain/status
 * @access  Private
 */
exports.toggleStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    if (!['online', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be online or offline'
        }
      });
    }

    const profile = await DeliveryPartnerProfile.findOne({ where: { userId } });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found'
        }
      });
    }

    await profile.update({
      isOnline: status === 'online',
      status: status === 'online' ? 'active' : 'inactive'
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      status: status
    });
  } catch (error) {
    next(error);
  }
};

