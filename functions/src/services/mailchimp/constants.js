const { getRuntimeConfig } = require("../../runtimeConfig");

exports.VALID_ROLES = ["patient", "p4", "professional", "facility", "admin"];
exports.getMailchimpConfig = () => {
  const cfg = getRuntimeConfig();
  return {
    listId: cfg.mailchimp.list_id,
  };
};
