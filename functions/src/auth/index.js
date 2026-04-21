const { onAuthenticatedUserDelete } = require("./cleanup");
const { createDailyPass } = require("./dayPass");
const {
  checkRegistrationEligibility,
  checkEmailExists,
} = require("./userManagement");
const { completeEmailUpdate } = require("./emailVerification");
const { createRegionalAdmin } = require("./createRegionalAdmin");

module.exports = {
  onAuthenticatedUserDelete,
  createDailyPass,
  checkRegistrationEligibility,
  checkEmailExists,
  completeEmailUpdate,
  createRegionalAdmin,
};
