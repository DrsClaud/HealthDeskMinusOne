import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Settings from "components/dashboard/Settings";
import ApprovalPage from "pages/dashboard/global-admin/ApprovalPage";
import AssistantManagerPage from "pages/dashboard/global-admin/AssistantManagerPage";
import UsageMonitorPage from "pages/dashboard/global-admin/UsageMonitorPage";
import RegionalAdminsPage from "pages/dashboard/global-admin/RegionalAdminsPage";
import HipaaComplianceCalendarPage from "pages/dashboard/global-admin/HipaaComplianceCalendarPage";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import ChartMindPage from "pages/dashboard/professional/ChartMindPage";
import MyChartsPage from "pages/dashboard/professional/MyChartsPage";
import DashboardLayout from "components/dashboard/DashboardLayout";
import { useAuth } from "hooks/useAuth";
import { PromptsManagerProvider } from "context/PromptsManager";

/**
 * Routes for platform super-admins (custom claim admin + role global_admin).
 * Includes ChartMind for testing the same flows as professional users.
 */
const GlobalAdminRoutes = () => {
  const { user, subscription } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isChartMindSessionList = /\/chartmind\/sessions\/?$/.test(path);
  const chartMindFullWidth =
    path.includes("/chartmind") && !isChartMindSessionList;

  return (
    <DashboardLayout fullWidth={chartMindFullWidth}>
      <PromptsManagerProvider>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard/prompts" replace />}
          />
          <Route
            path="/settings"
            element={<Settings uid={user?.uid} subscription={subscription} />}
          />
          <Route path="/admin/approval" element={<ApprovalPage />} />
          <Route
            path="/admin/regional-admins"
            element={<RegionalAdminsPage />}
          />
          <Route
            path="/admin/hipaa-compliance"
            element={<HipaaComplianceCalendarPage />}
          />
          <Route path="/admin/assistants" element={<AssistantManagerPage />} />
          <Route path="/admin/usage" element={<UsageMonitorPage />} />
          <Route path="/prompts" element={<PromptsManagerPage />} />
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
            path="*"
            element={<Navigate to="/dashboard/prompts" replace />}
          />
        </Routes>
      </PromptsManagerProvider>
    </DashboardLayout>
  );
};

export default GlobalAdminRoutes;
