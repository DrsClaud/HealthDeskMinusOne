import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const PatientMessagesInboxPage = () => (
  <PatientFeaturePlaceholderPage
    title="Messages"
    description="Review care messages from your clinical team."
    primaryAction={{ label: "Open Virtual MD", path: "/dashboard/virtual-md" }}
  />
);

export default PatientMessagesInboxPage;
