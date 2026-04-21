const { Stripe } = require("stripe");
const { getRuntimeConfig } = require("../../runtimeConfig");

let cached = null;

function getStripeClient() {
  if (!cached) {
    const cfg = getRuntimeConfig();
    cached = new Stripe(cfg.stripe.token, { apiVersion: "2020-08-27" });
  }
  return cached;
}

const stripeClient = new Proxy(
  {},
  {
    get(_target, prop) {
      return getStripeClient()[prop];
    },
  },
);

module.exports = { getStripeClient, stripeClient };
