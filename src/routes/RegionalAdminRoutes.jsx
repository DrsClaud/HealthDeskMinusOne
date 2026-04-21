import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Settings from "components/dashboard/Settings";
import PromptsManagerPage from "pages/dashboard/admin/prompts/PromptsManagerPage";
import DashboardLayout from "components/dashboard/DashboardLayout";
import { useAuth } from "hooks/useAuth";
import { PromptsManagerProvider } from "context/PromptsManager";

/**
 * Manual role: regional_admin + users.region → scopeId for llmLocalPrompts (scope=region).
 */
const RegionalAdminRoutes = () => {
  const { user, subscription } = useAuth();

  return (
    <DashboardLayout>
      <PromptsManagerProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/prompts" replace />} />
        <Route
          path="/settings"
          element={<Settings uid={user?.uid} subscription={subscription} />}
        />
        <Route path="/prompts" element={<PromptsManagerPage />} />
        <Route path="*" element={<Navigate to="/dashboard/prompts" replace />} />
      </Routes>
      </PromptsManagerProvider>
    </DashboardLayout>
  );
};

export default RegionalAdminRoutes;
