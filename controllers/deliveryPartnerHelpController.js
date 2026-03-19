const supportTicketController = require('./supportTicketController');

module.exports = {
  submitSupportTicket: supportTicketController.submitSupportTicket,
  getSupportTickets: supportTicketController.getSupportTickets,
  getSupportTicketDetails: supportTicketController.getSupportTicketDetails,
  replyToTicket: supportTicketController.replyToTicket
};
