const { stripeClient } = require("./client");

// Only export the Stripe client - subscription functions are now in /subscriptions
module.exports = {
  stripeClient,
};
