const { joinVirtualQueue } = require("./joinVirtualQueue");
const {
  notifyQueuePatient,
  sendPatientRegistration,
  deleteQueuePatient,
} = require("./queuePatientActions");
const { submitPatientRegistration } = require("./registrationSubmit");

module.exports = {
  joinVirtualQueue,
  notifyQueuePatient,
  sendPatientRegistration,
  deleteQueuePatient,
  submitPatientRegistration,
};
