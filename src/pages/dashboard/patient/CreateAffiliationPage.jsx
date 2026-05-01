import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const CreateAffiliationPage = () => (
  <PatientFeaturePlaceholderPage
    title="Check In"
    description="Connect with participating facilities and start your care workflow."
    primaryAction={{ label: "Open Symptom Checker", path: "/dashboard/symptom-check" }}
  />
);

export default CreateAffiliationPage;
