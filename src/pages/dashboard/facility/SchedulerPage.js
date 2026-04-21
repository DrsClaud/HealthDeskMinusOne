import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, CircularProgress, Alert, Link } from "@mui/material";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import SchedulerComponent from "components/scheduler/SchedulerComponent";
import PremiumAlert from "components/dashboard/PremiumAlert";
import PremiumWrapper from "components/dashboard/PremiumWrapper";
import { useAuth } from "hooks/useAuth";

const SchedulerPage = ({ data }) => {
  const { hasValidSubscription } = useAuth();

  // Get facility status using the new string-based enum
  const facilityStatus = data?.status || "approved";
  const isNotApproved = facilityStatus !== "approved";

  return (
    <div className="inner">
      <DashboardPageHeader
        title="Wait Time Scheduler"
        subtitle="Schedule your facility's wait times in advance to keep patients informed without requiring constant updates. Set expected wait times for different times of day."
      />

      {!data?.id ? (
        <CircularProgress />
      ) : (
        <Box>
          {!hasValidSubscription && (
            <PremiumAlert feature="Wait time scheduling" />
          )}

          {isNotApproved && (
            <Alert
              severity={facilityStatus === "pending" ? "warning" : "error"}
              sx={{ mb: 4 }}
            >
              {facilityStatus === "pending"
                ? "Scheduling is disabled until your facility is approved. This usually takes 1-2 days."
                : "Your facility has been rejected. Scheduling is disabled."}
            </Alert>
          )}

          {data?.queueEnabled === false && (
            <Alert severity="info" sx={{ mb: 3 }}>
              To get the most out of scheduling, enable your{" "}
              <Link component={RouterLink} to="/dashboard/waiting-room">
                Virtual Waiting Room
              </Link>{" "}
              first.
            </Alert>
          )}

          <PremiumWrapper disabled={!hasValidSubscription}>
            <SchedulerComponent
              data={data}
              previewMode={!hasValidSubscription}
            />
          </PremiumWrapper>
        </Box>
      )}
    </div>
  );
};

export default SchedulerPage;
