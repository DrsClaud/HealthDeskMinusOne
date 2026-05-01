import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const ReviewHistoryPage = () => (
  <PatientFeaturePlaceholderPage
    title="Update My Medications"
    description="Use voice-assisted review to update your medication history."
    primaryAction={{ label: "Open Medications", path: "/dashboard/medications" }}
  />
);

export default ReviewHistoryPage;
