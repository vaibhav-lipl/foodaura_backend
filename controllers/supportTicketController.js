const { Op } = require('sequelize');
const { SupportTicket, SupportTicketMessage, User } = require('../models');

const USER_TICKET_TYPES = ['customer', 'delivery_partner'];
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const getUserTicketType = (user) => {
  if (user.role === 'delivery_partner') {
    return 'delivery_partner';
  }

  if (user.role === 'customer') {
    return 'customer';
  }

  return null;
};

const buildTicketNumber = () => `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const serializeMessage = (message) => ({
  id: message.id,
  ticketId: message.ticketId,
  senderId: message.senderId,
  senderType: message.senderType,
  sender: message.sender ? {
    id: message.sender.id,
    name: message.sender.name,
    email: message.sender.email,
    phone: message.sender.phone,
    role: message.sender.role
  } : null,
  message: message.message,
  attachments: message.attachments || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

const serializeTicket = (ticket, includeMessages = false) => ({
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  userId: ticket.userId,
  user_type: ticket.userType,
  user: ticket.user ? {
    id: ticket.user.id,
    name: ticket.user.name,
    email: ticket.user.email,
    phone: ticket.user.phone,
    role: ticket.user.role
  } : null,
  category: ticket.category,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  messages: includeMessages ? (ticket.messages || []).map(serializeMessage) : undefined
});

const ticketInclude = (includeMessages = false) => {
  const include = [{
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'email', 'phone', 'role']
  }];

  if (includeMessages) {
    include.push({
      model: SupportTicketMessage,
      as: 'messages',
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'phone', 'role']
      }],
      separate: true,
      order: [['createdAt', 'ASC']]
    });
  }

  return include;
};

const getTicketForUser = async (ticketId, user) => {
  const userType = getUserTicketType(user);
  if (!userType) {
    return null;
  }

  return SupportTicket.findOne({
    where: {
      id: ticketId,
      userId: user.id,
      userType
    },
    include: ticketInclude(true)
  });
};

exports.submitSupportTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = getUserTicketType(req.user);
    const { category, subject, description, attachments = [] } = req.body;

    if (!userType) {
      return res.status(403).json({
        success: false,
        message: 'Only customers and delivery partners can create support tickets'
      });
    }

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category, subject, and description are required'
        }
      });
    }

    const ticket = await SupportTicket.create({
      ticketNumber: buildTicketNumber(),
      userId,
      userType,
      category: String(category).trim(),
      subject: String(subject).trim(),
      description: String(description).trim(),
      status: 'open'
    });

    await SupportTicketMessage.create({
      ticketId: ticket.id,
      senderId: userId,
      senderType: userType,
      message: String(description).trim(),
      attachments
    });

    const createdTicket = await SupportTicket.findByPk(ticket.id, {
      include: ticketInclude(true)
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: serializeTicket(createdTicket, true)
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportTickets = async (req, res, next) => {
  try {
    const userType = getUserTicketType(req.user);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const where = {
      userId: req.user.id,
      userType
    };

    if (!userType) {
      return res.status(403).json({
        success: false,
        message: 'Only customers and delivery partners can view support tickets'
      });
    }

    if (req.query.status) {
      if (!TICKET_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid support ticket status'
        });
      }
      where.status = req.query.status;
    }

    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      include: ticketInclude(false),
      order: [['updatedAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      tickets: rows.map((ticket) => serializeTicket(ticket)),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportTicketDetails = async (req, res, next) => {
  try {
    const ticket = await getTicketForUser(req.params.ticketId, req.user);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      ticket: serializeTicket(ticket, true)
    });
  } catch (error) {
    next(error);
  }
};

exports.replyToTicket = async (req, res, next) => {
  try {
    const { message, attachments = [] } = req.body;
    const userType = getUserTicketType(req.user);

    if (!userType) {
      return res.status(403).json({
        success: false,
        message: 'Only customers and delivery partners can reply to support tickets'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required'
        }
      });
    }

    const ticket = await getTicketForUser(req.params.ticketId, req.user);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    const createdMessage = await SupportTicketMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderType: userType,
      message: String(message).trim(),
      attachments
    });

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await ticket.update({ status: 'open' });
    } else {
      await ticket.update({ updatedAt: new Date() });
    }

    const savedMessage = await SupportTicketMessage.findByPk(createdMessage.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'phone', 'role']
      }]
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: serializeMessage(savedMessage)
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminSupportTickets = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.status) {
      if (!TICKET_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid support ticket status'
        });
      }
      where.status = req.query.status;
    }

    if (req.query.user_type) {
      if (!USER_TICKET_TYPES.includes(req.query.user_type)) {
        return res.status(400).json({
          success: false,
          message: 'user_type must be customer or delivery_partner'
        });
      }
      where.userType = req.query.user_type;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        where[Op.or] = [
          { ticketNumber: { [Op.like]: `%${search}%` } },
          { category: { [Op.like]: `%${search}%` } },
          { subject: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      include: ticketInclude(false),
      order: [['updatedAt', 'DESC']],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows.map((ticket) => serializeTicket(ticket)),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get Admin Support Tickets Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets'
    });
  }
};

exports.getAdminSupportTicketDetails = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id, {
      include: ticketInclude(true)
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    return res.json({
      success: true,
      data: serializeTicket(ticket, true)
    });
  } catch (error) {
    console.error('Get Admin Support Ticket Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket details'
    });
  }
};

exports.replyToSupportTicketAsAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    const { message, attachments = [], status } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required'
      });
    }

    if (status && !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid support ticket status'
      });
    }

    const createdMessage = await SupportTicketMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderType: 'admin',
      message: String(message).trim(),
      attachments
    });

    await ticket.update({
      status: status || 'in_progress'
    });

    const savedMessage = await SupportTicketMessage.findByPk(createdMessage.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'phone', 'role']
      }]
    });

    return res.json({
      success: true,
      message: 'Support ticket reply sent successfully',
      data: {
        ticketId: ticket.id,
        status: status || 'in_progress',
        reply: serializeMessage(savedMessage)
      }
    });
  } catch (error) {
    console.error('Reply To Support Ticket As Admin Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reply to support ticket'
    });
  }
};

exports.updateSupportTicketStatus = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    const { status } = req.body;
    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid support ticket status'
      });
    }

    await ticket.update({ status });

    return res.json({
      success: true,
      message: 'Support ticket status updated successfully',
      data: serializeTicket(ticket)
    });
  } catch (error) {
    console.error('Update Support Ticket Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update support ticket status'
    });
  }
};
