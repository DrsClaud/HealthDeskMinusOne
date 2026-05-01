import React from "react";
import { useParams } from "react-router-dom";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const PatientMessageDetailPage = () => {
  const { threadId } = useParams();
  return (
    <PatientFeaturePlaceholderPage
      title={`Message ${threadId || ""}`.trim()}
      description="Message detail view is being ported from Experimental."
      primaryAction={{ label: "Back To Messages", path: "/dashboard/messages" }}
    />
  );
};

export default PatientMessageDetailPage;
