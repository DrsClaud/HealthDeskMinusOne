const placeBid = require("./placeBid");
const processAuctionWinners = require("./processAuctionWinners");
const processPayment = require("./processPayment");
const endAuctions = require("./endAuctions");
const getUserPaymentMethod = require("./getUserPaymentMethod");
// const handleFailedPayment = require("./handleFailedPayment");

// Simple exports with no prefixes or namespaces
module.exports = {
  placeBid,
  processAuctionWinners,
  endAuctions,
  getUserPaymentMethod,

  // Webhook handlers
  processPayment,
};

// Safely export the run functions if they exist
if (processAuctionWinners && typeof processAuctionWinners.run === "function") {
  module.exports.processAuctionWinnersRun = processAuctionWinners.run;
}

if (endAuctions && typeof endAuctions.run === "function") {
  module.exports.endAuctionsRun = endAuctions.run;
}
