import React from "react";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import WaitTimeForm from "components/dashboard/WaitTimeForm";
import CapabilitiesForm from "components/dashboard/CapabilitiesForm";

const StatusBoardPage = ({ data }) => {
  return (
    <div className="inner">
      <DashboardPageHeader
        title="Status Board"
        subtitle="Update the status of your facility's waiting room to let potential patients know how long they'll be waiting and the capabilities of your facility."
      />

      <WaitTimeForm data={data} />
      <CapabilitiesForm data={data} />
    </div>
  );
};

export default StatusBoardPage;
