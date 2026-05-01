import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const DataLinksPage = () => (
  <PatientFeaturePlaceholderPage
    title="Data Links"
    description="Manage trusted links to your care and record systems."
    primaryAction={{ label: "Open SecureLink", path: "/dashboard/secureLink" }}
  />
);

export default DataLinksPage;
