import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Grid, Typography } from "@mui/material";
import Loading from "components/Loading";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { Add } from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import { usePromptsManager } from "hooks/usePromptsManager";
import { LLMManagerProvider } from "pages/dashboard/LLMManagerContext";
import GraphMonthlyUsageChartmind from "components/dashboard/admin/Graphs/GraphMonthlyUsageChartmind";
import { isChartmindAdminRole } from "constants/roles";
import PromptCard from "./components/PromptCard";
import PromptEditorDialog from "./components/PromptEditorDialog";

const UNCATEGORIZED_LABEL = "Uncategorized";

const groupPromptsByCategory = (rows) => {
  const map = new Map();
  for (const p of rows) {
    const raw = p.category && String(p.category).trim();
    const key = raw || UNCATEGORIZED_LABEL;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED_LABEL) return 1;
    if (b === UNCATEGORIZED_LABEL) return -1;
    return a.localeCompare(b);
  });
  return keys.map((category) => ({ category, items: map.get(category) }));
};

const PromptsManagerContent = () => {
  const navigate = useNavigate();
  const { user, userData, isGlobalAdmin, isRegionalAdmin, organizationId } =
    useAuth();
  const regionScope = String(userData?.region || "").trim() || null;
  const canManageAsGlobal = Boolean(isGlobalAdmin);
  const canManageAsOrg =
    (userData?.role === "admin" || isChartmindAdminRole(userData?.role)) &&
    Boolean(organizationId);
  const canManageRegional = Boolean(isRegionalAdmin && regionScope);
  const {
    prompts,
    loading,
    saving,
    error,
    savePrompt,
    createPrompt,
    canView,
  } = usePromptsManager();

  const sections = useMemo(() => groupPromptsByCategory(prompts), [prompts]);
  const hasChartmindSection = useMemo(
    () =>
      sections.some(
        ({ category }) => String(category || "").trim().toLowerCase() === "chartmind",
      ),
    [sections],
  );

  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [createMode, setCreateMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const openCreate = () => {
    setCreateMode(true);
    setSelectedPrompt({ id: "", category: "chartmind" });
  };

  const goSimulateChartMindEncounter = () => {
    const currentPath = window.location.pathname;
    const isOnSavedSession = currentPath.match(
      /\/dashboard\/chartmind\/[^/]+$/
    );
    navigate("/dashboard/chartmind", {
      state: {
        key: Date.now(),
        reportingOrganizationId: organizationId || null,
      },
      ...(isOnSavedSession ? { replace: true } : {}),
    });
  };

  const openEdit = (prompt) => {
    setCreateMode(false);
    setSelectedPrompt(prompt);
  };

  const handleCloseEditor = () => setSelectedPrompt(null);

  const handleSubmit = async ({ id, updates, reason = null }) => {
    if (createMode) {
      await createPrompt({
        id,
        data: updates,
        reason,
        actorUid: user?.uid,
        actorEmail: user?.email || null,
      });
      setSuccessMsg(`Prompt "${id}" created.`);
      setSelectedPrompt(null);
    } else {
      const updated = await savePrompt({
        id,
        updates,
        reason,
        actorUid: user?.uid,
        actorEmail: user?.email || null,
      });
      setSuccessMsg(`Prompt "${id}" saved.`);
      setSelectedPrompt(updated);
    }
  };

  if (!canView) {
    return (
      <Alert severity="warning">
        You do not have permission to manage prompts.
      </Alert>
    );
  }

  return (
    <Box>
      <DashboardPageHeader
        title="Prompts"
        subtitle={
          canManageRegional
            ? `Regional prompts for region "${regionScope}". Embedded / clinical tabs are UI-only until wired to storage.`
            : "Manage AI prompt behavior for your organization."
        }
        actions={
          canManageAsGlobal ? (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: { xs: "flex-start", sm: "flex-end" },
              }}
            >
              <Button
                variant="outlined"
                onClick={goSimulateChartMindEncounter}
              >
                Simulate a ChartMind encounter
              </Button>
              <Button startIcon={<Add />} variant="contained" onClick={openCreate}>
                New Prompt
              </Button>
            </Box>
          ) : null
        }
      />

      {successMsg ? (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Loading page />
      ) : (
        <Box sx={{ mt: 3 }}>
          {organizationId && !hasChartmindSection ? (
            <GraphMonthlyUsageChartmind organizationId={organizationId} />
          ) : null}
          {sections.map(({ category, items }) => (
            <Box key={category} sx={{ mb: 4 }}>
              {organizationId &&
              String(category || "").trim().toLowerCase() === "chartmind" ? (
                <GraphMonthlyUsageChartmind organizationId={organizationId} />
              ) : null}
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  display: "block",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  mb: 1.5,
                }}
              >
                {category}
              </Typography>
              <Grid container spacing={2}>
                {items.map((prompt) => (
                  <Grid key={prompt.id} item xs={12} md={6} lg={4}>
                    <PromptCard prompt={prompt} onEdit={openEdit} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
          {!error && !prompts.length ? (
            <Alert severity="info">
              No prompts found. This can be normal in a new environment with no
              `llmQueryConfig` documents yet.
            </Alert>
          ) : null}
        </Box>
      )}

      <PromptEditorDialog
        open={Boolean(selectedPrompt)}
        prompt={selectedPrompt}
        createMode={createMode}
        saving={saving}
        canEditGlobal={canManageAsGlobal}
        canEditOrganization={canManageAsOrg && !canManageAsGlobal}
        canEditRegional={canManageRegional && !canManageAsGlobal}
        onClose={handleCloseEditor}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

const PromptsManagerPage = () => {
  const { user, userData, isGlobalAdmin } = useAuth();

  const managerUser = useMemo(
    () => ({
      ...(userData || {}),
      uid: user?.uid,
      admin: Boolean(isGlobalAdmin),
    }),
    [userData, user?.uid, isGlobalAdmin],
  );

  return (
    <LLMManagerProvider user={managerUser}>
      <PromptsManagerContent />
    </LLMManagerProvider>
  );
};

export default PromptsManagerPage;
