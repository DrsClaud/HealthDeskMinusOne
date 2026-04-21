const twilio = require("twilio");
const { getRuntimeConfig } = require("../../runtimeConfig");

let cachedClient = null;

function getTwilioClient() {
  if (!cachedClient) {
    const cfg = getRuntimeConfig();
    cachedClient = twilio(cfg.twilio.account, cfg.twilio.token);
  }
  return cachedClient;
}

const twilioClient = new Proxy(
  {},
  {
    get(_target, prop) {
      return getTwilioClient()[prop];
    },
  },
);

exports.twilioClient = twilioClient;
exports.getTwilioClient = getTwilioClient;
