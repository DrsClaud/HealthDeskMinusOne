import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import TeamPage from "pages/dashboard/admin/TeamPage";
import UsagePage from "pages/dashboard/admin/UsagePage";
import AdminOnboarding from "pages/dashboard/admin/AdminOnboarding";
import Settings from "components/dashboard/Settings";
import { useAuth } from "hooks/useAuth";
import DashboardLayout from "components/dashboard/DashboardLayout";
import { PromptsManagerProvider } from "context/PromptsManager";
import { isChartmindAdminRole } from "constants/roles";

/**
 * AdminRoutes - Routes for ChartMind Manager (admin role)
 *
 * Flow:
 * - No subscription → Full-screen onboarding (purchase seats)
 * - Has subscription → Dashboard with Prompts + Organization
 */
const AdminRoutes = () => {
  const { user, userData, subscription, subscriptionData } = useAuth();
  const hasActiveSubscription = subscriptionData?.status === "active";
  const isChartmindManager = isChartmindAdminRole(userData?.role);

  // Org admins require an active subscription; ChartMind managers do not.
  if (!hasActiveSubscription && !isChartmindManager) {
    return <AdminOnboarding />;
  }

  // Normal dashboard with sidebar
  return (
    <DashboardLayout>
      <PromptsManagerProvider>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/dashboard/prompts" replace />}
        />
        <Route path="/prompts" element={<PromptsManagerPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route
          path="/settings"
          element={<Settings uid={user.uid} subscription={subscription} />}
        />
        <Route path="*" element={<Navigate to="/dashboard/prompts" />} />
      </Routes>
      </PromptsManagerProvider>
    </DashboardLayout>
  );
};

export default AdminRoutes;
