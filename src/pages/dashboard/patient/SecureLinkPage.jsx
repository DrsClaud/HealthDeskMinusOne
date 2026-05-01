import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const SecureLinkPage = () => (
  <PatientFeaturePlaceholderPage
    title="Link To An EHR"
    description="Configure SecureLink and share your CMR snapshot with your care team."
    primaryAction={{ label: "Open CMR", path: "/dashboard/health-records" }}
  />
);

export default SecureLinkPage;
