/**
 * @desc    Get FAQs
 * @route   GET /api/captain/help/faqs
 * @access  Private
 */
exports.getFAQs = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Sample FAQs - in production, these would come from a database
    const allFAQs = [
      {
        id: 'faq_1',
        category: 'deliveries',
        question: 'How do I accept a delivery?',
        answer: 'When a new delivery becomes available, you will see it in the Available Deliveries section. Tap on a delivery to view details, then tap "Accept" to accept it.'
      },
      {
        id: 'faq_2',
        category: 'deliveries',
        question: 'What should I do if I cannot find the customer?',
        answer: 'Call the customer using the phone number provided in the order details. If you still cannot reach them, contact support.'
      },
      {
        id: 'faq_3',
        category: 'earnings',
        question: 'When will I receive my earnings?',
        answer: 'Earnings are credited to your account immediately after completing a delivery. You can request a payout to your bank account or UPI ID.'
      },
      {
        id: 'faq_4',
        category: 'account',
        question: 'How do I update my profile?',
        answer: 'Go to Profile section and tap Edit. You can update your personal information, vehicle details, and documents.'
      }
    ];

    let faqs = allFAQs;
    if (category) {
      faqs = allFAQs.filter(faq => faq.category === category);
    }

    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit Support Ticket
 * @route   POST /api/captain/help/support-tickets
 * @access  Private
 */
exports.submitSupportTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, subject, description, attachments } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category, subject, and description are required'
        }
      });
    }

    // In production, this would create a ticket in the database
    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: `ticket_${Date.now()}`,
        ticketNumber,
        status: 'open',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Support Tickets
 * @route   GET /api/captain/help/support-tickets
 * @access  Private
 */
exports.getSupportTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    // In production, this would fetch from database
    const tickets = [];

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Support Ticket Details
 * @route   GET /api/captain/help/support-tickets/:ticketId
 * @access  Private
 */
exports.getSupportTicketDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    // In production, this would fetch from database
    res.json({
      success: true,
      ticket: {
        id: ticketId,
        ticketNumber: `TKT-${ticketId}`,
        category: 'technical',
        subject: 'Sample ticket',
        description: 'Sample description',
        status: 'open',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reply to Support Ticket
 * @route   POST /api/captain/help/support-tickets/:ticketId/reply
 * @access  Private
 */
exports.replyToTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required'
        }
      });
    }

    // In production, this would save the reply to database
    res.json({
      success: true,
      message: 'Reply sent successfully',
      messageId: `msg_${Date.now()}`
    });
  } catch (error) {
    next(error);
  }
};

