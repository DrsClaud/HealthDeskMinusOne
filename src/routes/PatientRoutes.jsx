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
import MedicationTrackingPage from "pages/dashboard/individual/MedicationTrackingPage";
import DiscussSymptomsPage from "pages/dashboard/individual/DiscussSymptomsPage";
import { db } from "services/firebase";
import { PromptsManagerProvider } from "context/PromptsManager";
import ChatPage from "components/chat_new/ChatPage";
import P4WorkspacePage from "pages/dashboard/P4WorkspacePage";
import MedicalSuperIntelligencePage from "pages/dashboard/MedicalSuperIntelligencePage";
import ReviewHistoryPage from "pages/dashboard/patient/ReviewHistoryPage";
import CreateAffiliationPage from "pages/dashboard/patient/CreateAffiliationPage";
import DischargeInstructionsPage from "pages/dashboard/patient/DischargeInstructionsPage";
import DataLinksPage from "pages/dashboard/patient/DataLinksPage";
import SecureLinkPage from "pages/dashboard/patient/SecureLinkPage";
import MyQueuePage from "pages/dashboard/patient/MyQueuePage";
import PatientMessagesInboxPage from "pages/dashboard/patient/PatientMessagesInboxPage";
import PatientMessageDetailPage from "pages/dashboard/patient/PatientMessageDetailPage";
import { isPatientFamilyRole } from "constants/roles";

const RoleGuard = ({
  allowedRoles,
  children,
  fallback = <Navigate to="/dashboard" replace />,
}) => {
  const { userData, userLoading } = useAuth();

  if (userLoading || !userData) return null;
  if (!allowedRoles.includes(userData.role)) return fallback;
  return children;
};

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
    return (
      sub === "advanced-library" ||
      sub === "virtual-md" ||
      sub === "messages" ||
      sub === "symptom-check"
    );
  };

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user?.uid) {
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          if (
            isPatientFamilyRole(userData?.role) &&
            !userData?.hideOnboardingDialog
          ) {
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
            element={
              userData?.role === "p4" ? (
                <Navigate to="/dashboard/p4" replace />
              ) : (
                <ChatPage assistantType="basic-medical-library" />
              )
            }
          />
          <Route
            path="/p4"
            element={
              <RoleGuard allowedRoles={["p4"]}>
                <P4WorkspacePage />
              </RoleGuard>
            }
          />
          <Route
            path="/advanced-library"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <ChatPage assistantType="advanced-medical-library" />
              </RoleGuard>
            }
          />
          <Route
            path="/virtual-md"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <ChatPage assistantType="virtual-md" />
              </RoleGuard>
            }
          />
          <Route
            path="/medical-superintelligence"
            element={
              <RoleGuard allowedRoles={["p4"]}>
                <MedicalSuperIntelligencePage />
              </RoleGuard>
            }
          />
          <Route
            path="/symptom-check"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <DiscussSymptomsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/messages"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <PatientMessagesInboxPage />
              </RoleGuard>
            }
          />
          <Route
            path="/messages/:threadId"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <PatientMessageDetailPage />
              </RoleGuard>
            }
          />

          <Route
            path="/settings"
            element={<Settings uid={user?.uid} subscription={subscription} />}
          />
          <Route
            path="/health-records"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <HealthRecords />
              </RoleGuard>
            }
          />
          <Route
            path="/medications"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <MedicationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/medication-tracking"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <MedicationTrackingPage />
              </RoleGuard>
            }
          />
          <Route
            path="/review-history"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <ReviewHistoryPage />
              </RoleGuard>
            }
          />
          <Route
            path="/create-affiliation"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <CreateAffiliationPage />
              </RoleGuard>
            }
          />
          <Route
            path="/discharge-instructions"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <DischargeInstructionsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/data-links"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <DataLinksPage />
              </RoleGuard>
            }
          />
          <Route
            path="/my-queue"
            element={
              <RoleGuard allowedRoles={["patient", "p4"]}>
                <MyQueuePage />
              </RoleGuard>
            }
          />
          <Route
            path="/secureLink"
            element={
              <RoleGuard allowedRoles={["p4"]}>
                <SecureLinkPage />
              </RoleGuard>
            }
          />

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
