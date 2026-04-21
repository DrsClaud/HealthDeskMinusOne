const mailchimp = require("@mailchimp/mailchimp_marketing");
const { getRuntimeConfig } = require("../../runtimeConfig");

let configured = false;

function getMailchimpClient() {
  if (!configured) {
    const cfg = getRuntimeConfig();
    mailchimp.setConfig({
      apiKey: cfg.mailchimp.api_key,
      server: cfg.mailchimp.server_prefix,
    });
    configured = true;
  }
  return mailchimp;
}

const mailchimpClient = new Proxy(
  {},
  {
    get(_target, prop) {
      return getMailchimpClient()[prop];
    },
  },
);

exports.mailchimpClient = mailchimpClient;
exports.getMailchimpClient = getMailchimpClient;
