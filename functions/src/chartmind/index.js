const functions = require("firebase-functions/v1");

const clinicalReferences = require("./clinical_references");
const embeddedDocuments = require("./embedded_documents");
const usageTracking = require("./usageTracking");

module.exports = {
  clinicalreferences_uploaddocs: functions
    .runWith({ timeoutSeconds: 540, memory: "2GB" })
    .https.onCall(clinicalReferences.clinicalreferences_uploaddocs),
  clinicalreferences_retrieve_lexical: functions
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(clinicalReferences.clinicalreferences_retrieve_lexical),
  clinicalreferences_retrieve_llm: functions
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(clinicalReferences.clinicalreferences_retrieve_llm),
  clinicalreferences_listdocs: functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(clinicalReferences.clinicalreferences_listdocs),
  clinicalreferences_deletedocs: functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(clinicalReferences.clinicalreferences_deletedocs),
  embeddeddocuments_uploaddocs: functions
    .runWith({ timeoutSeconds: 540, memory: "2GB" })
    .https.onCall(embeddedDocuments.embeddeddocuments_uploaddocs),
  embeddeddocuments_retrieve: functions
    .runWith({ timeoutSeconds: 120, memory: "1GB" })
    .https.onCall(embeddedDocuments.embeddeddocuments_retrieve),
  embeddeddocuments_listdocs: functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(embeddedDocuments.embeddeddocuments_listdocs),
  embeddeddocuments_setpublic: functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(embeddedDocuments.embeddeddocuments_setpublic),
  embeddeddocuments_deletedocs: functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(embeddedDocuments.embeddeddocuments_deletedocs),
  trackChartmindSessionCompletion: usageTracking.trackChartmindSessionCompletion,
};
