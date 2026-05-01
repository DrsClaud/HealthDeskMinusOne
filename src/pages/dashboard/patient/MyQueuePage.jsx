import React from "react";
import PatientFeaturePlaceholderPage from "./PatientFeaturePlaceholderPage";

const MyQueuePage = () => (
  <PatientFeaturePlaceholderPage
    title="My Queue"
    description="Track your place in care queues for participating clinics."
    primaryAction={{ label: "Open Check In", path: "/dashboard/create-affiliation" }}
  />
);

export default MyQueuePage;
