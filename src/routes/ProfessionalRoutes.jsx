import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import UpgradePage from "pages/dashboard/UpgradePage";
import ApprovalPage from "pages/dashboard/global-admin/ApprovalPage";
import AssistantManagerPage from "pages/dashboard/global-admin/AssistantManagerPage";
import UsageMonitorPage from "pages/dashboard/global-admin/UsageMonitorPage";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import DashboardLayout from "components/dashboard/DashboardLayout";
import Settings from "components/dashboard/Settings";
import ProfessionalOnboardingDialog from "components/dashboard/ProfessionalOnboardingDialog";
import HealthRecords from "components/dashboard/HealthRecords";
import { db } from "services/firebase";
import { PromptsManagerProvider } from "context/PromptsManager";
import ChatPage from "components/chat_new/ChatPage";
import ChartMindPage from "pages/dashboard/professional/ChartMindPage";
import MyChartsPage from "pages/dashboard/professional/MyChartsPage";

const ProfessionalRoutes = () => {
  const { user, userData, subscription, isGlobalAdmin } = useAuth();
  const location = useLocation();
  const [showProfessionalOnboarding, setShowProfessionalOnboarding] =
    useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user?.uid) {
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          if (
            userData?.role === "professional" &&
            !userData?.hideOnboardingDialog
          ) {
            setShowProfessionalOnboarding(true);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Full-width for chat surfaces and ChartMind editor (not the session list)
  const isChatRoute = () => {
    const path = location.pathname;
    const isChartMindSessionList = /\/chartmind\/sessions\/?$/.test(path);
    return (
      path === "/dashboard" ||
      path === "/dashboard/" ||
      path.includes("/deepdive") ||
      path.includes("/peerview") ||
      (path.includes("/chartmind") && !isChartMindSessionList)
    );
  };

  return (
    <DashboardLayout fullWidth={isChatRoute()}>
      <ProfessionalOnboardingDialog
        open={showProfessionalOnboarding}
        onClose={() => setShowProfessionalOnboarding(false)}
        userId={user?.uid}
      />

      <PromptsManagerProvider>
        <Routes>
          <Route
            path="/"
            element={<ChatPage assistantType="brainflash" />}
          />
          <Route
            path="/deepdive"
            element={<ChatPage assistantType="deep-dive" />}
          />
          <Route
            path="/peerview"
            element={<ChatPage assistantType="peer-review" />}
          />
          <Route
            path="/chartmind"
            element={
              <ChartMindPage key={location.state?.key || location.pathname} />
            }
          />
          <Route path="/chartmind/sessions" element={<MyChartsPage />} />
          <Route
            path="/chartmind/:sessionId"
            element={
              <ChartMindPage key={location.state?.key || location.pathname} />
            }
          />

          <Route
            path="/settings"
            element={<Settings uid={user?.uid} subscription={subscription} />}
          />
          <Route path="/health-records" element={<HealthRecords />} />

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

export default ProfessionalRoutes;
