import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import { useFacility } from "hooks/useFacility";
import UpgradePage from "pages/dashboard/UpgradePage";
import ApprovalPage from "pages/dashboard/global-admin/ApprovalPage";
import AssistantManagerPage from "pages/dashboard/global-admin/AssistantManagerPage";
import UsageMonitorPage from "pages/dashboard/global-admin/UsageMonitorPage";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import DashboardLayout from "components/dashboard/DashboardLayout";
import Settings from "components/dashboard/Settings";
import PatientOnboardingDialog from "components/dashboard/PatientOnboardingDialog";
import HealthRecords from "components/dashboard/HealthRecords";
import MedicationsPage from "pages/dashboard/individual/MedicationsPage";
// TODO: MedicationTrackingPage disabled until Twilio BAA is in place (no reminders = no tracking utility)
// import MedicationTrackingPage from "pages/dashboard/individual/MedicationTrackingPage";
import { db } from "services/firebase";
import { PromptsManagerProvider } from "context/PromptsManager";
import ChatPage from "components/chat_new/ChatPage";

const PatientRoutes = () => {
  const { user, userData, subscription, isGlobalAdmin } = useAuth();
  const { data } = useFacility();
  const location = useLocation();
  const [showPatientOnboarding, setShowPatientOnboarding] = useState(false);

  // Full-width chat (minus sidebar): history panel must not sit inside the narrow page column
  const isPatientChatRoute = () => {
    const segments = location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    if (segments[0] !== "dashboard") return false;
    if (segments.length === 1) return true;
    const sub = segments[1];
    return sub === "advanced-library" || sub === "virtual-md";
  };

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user?.uid) {
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          if (userData?.role === "patient" && !userData?.hideOnboardingDialog) {
            setShowPatientOnboarding(true);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    };

    checkOnboardingStatus();
  }, [user]);

  return (
    <DashboardLayout fullWidth={isPatientChatRoute()}>
      <PatientOnboardingDialog
        open={showPatientOnboarding}
        onClose={() => setShowPatientOnboarding(false)}
        userId={user?.uid}
      />

      <PromptsManagerProvider>
        <Routes>
          <Route
            path="/"
            element={<ChatPage assistantType="basic-medical-library" />}
          />
          <Route
            path="/advanced-library"
            element={<ChatPage assistantType="advanced-medical-library" />}
          />
          <Route
            path="/virtual-md"
            element={<ChatPage assistantType="virtual-md" />}
          />

          <Route
            path="/settings"
            element={<Settings uid={user?.uid} subscription={subscription} />}
          />
          <Route path="/health-records" element={<HealthRecords />} />
          <Route path="/medications" element={<MedicationsPage />} />
          {/* TODO: Medication tracking disabled until Twilio BAA is in place */}
          {/* <Route
            path="/medication-tracking"
            element={<MedicationTrackingPage />}
          /> */}

          {!userData?.dailyPassExpiresAt && (
            <Route path="/upgrade" element={<UpgradePage />} />
          )}

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

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </PromptsManagerProvider>
    </DashboardLayout>
  );
};

export default PatientRoutes;
