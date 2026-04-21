import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StatusBoardPage from "pages/dashboard/facility/StatusBoardPage";
// TODO: Virtual Queue + Virtual Registration disabled until Twilio BAA is in place
// import WaitingRoom from "components/queue/WaitingRoom";
import SchedulerPage from "pages/dashboard/facility/SchedulerPage";
// import VirtualRegistrationPage from "pages/dashboard/facility/VirtualRegistrationPage";
import Settings from "components/dashboard/Settings";
import AuctionPage from "pages/dashboard/AuctionPage";
import UpgradePage from "pages/dashboard/UpgradePage";
import ApprovalPage from "pages/dashboard/global-admin/ApprovalPage";
import AssistantManagerPage from "pages/dashboard/global-admin/AssistantManagerPage";
import UsageMonitorPage from "pages/dashboard/global-admin/UsageMonitorPage";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import { useFacility } from "hooks/useFacility";
import { useAuth } from "hooks/useAuth";
// import QueueDisplay from "components/queue/splitflap/QueueDisplay";
import DashboardLayout from "components/dashboard/DashboardLayout";
import FacilityOnboardingDialog from "components/dashboard/FacilityOnboardingDialog";
import FacilityChecklist from "components/dashboard/FacilityChecklist";
import { db } from "services/firebase";
import { PromptsManagerProvider } from "context/PromptsManager";

const DashboardRoutes = () => {
  const { data, setData } = useFacility();
  const { user, subscription, isGlobalAdmin } = useAuth();
  const location = useLocation();
  // const isBoard = location.pathname === "/dashboard/queue/board";
  const isBoard = false;
  const [showFacilityOnboarding, setShowFacilityOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user?.uid) {
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          if (
            userData?.role === "facility" &&
            !userData?.hideFacilityOnboardingDialog
          ) {
            setShowFacilityOnboarding(true);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleCloseFacilityOnboarding = () => {
    setShowFacilityOnboarding(false);
  };

  return (
    <DashboardLayout fullWidth={isBoard}>
      {!isBoard && <FacilityChecklist locationData={data} />}

      <FacilityOnboardingDialog
        open={showFacilityOnboarding}
        onClose={handleCloseFacilityOnboarding}
        userId={user?.uid}
        locationData={data}
      />
      <PromptsManagerProvider>
        <Routes>
          <Route exact path="/" element={<StatusBoardPage data={data} />} />
          {/* TODO: Virtual Queue routes disabled until Twilio BAA is in place */}
          {/* <Route
            path="/queue/board"
            element={<QueueDisplay queue={data.queue} />}
          />
          <Route
            path="/virtual-registration"
            element={<VirtualRegistrationPage data={data} setData={setData} />}
          />
          <Route
            path="/queue"
            element={<WaitingRoom data={data} setData={setData} />}
          /> */}
          <Route
            path="/schedule"
            element={<SchedulerPage data={data} setData={setData} />}
          />
          <Route
            path="/settings"
            element={<Settings uid={user.uid} subscription={subscription} />}
          />
          <Route path="/upgrade" element={<UpgradePage />} />

          {/* Global-admin-only routes */}
          <Route
            path="/admin/approval"
            element={
              isGlobalAdmin ? (
                <ApprovalPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/admin/assistants"
            element={
              isGlobalAdmin ? (
                <AssistantManagerPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/admin/usage"
            element={
              isGlobalAdmin ? (
                <UsageMonitorPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/prompts"
            element={
              isGlobalAdmin ? (
                <PromptsManagerPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route path="/advertising" element={<AuctionPage />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </PromptsManagerProvider>
    </DashboardLayout>
  );
};

export default DashboardRoutes;
