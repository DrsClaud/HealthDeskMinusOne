import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const DischargeInstructionsPage = () => (
  <PatientFeaturePlaceholderPage
    title="Discharge Instructions"
    description="View instructions and summaries from your facility visits."
    primaryAction={{ label: "Open Health Records", path: "/dashboard/health-records" }}
  />
);

export default DischargeInstructionsPage;
