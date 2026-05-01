import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "hooks/useAuth";
import promptRegistryService from "services/llm/promptRegistryService";
import { isChartmindAdminRole } from "constants/roles";

// ============================================
// Module helpers (not exported)
// ============================================

const formatFirestoreError = (error, operation) => {
  const code = error?.code || "unknown";
  const message = error?.message || "Unknown Firestore error.";
  const source = error?.promptRegistrySource
    ? ` Source: ${error.promptRegistrySource}.`
    : "";

  if (code === "permission-denied") {
    return `Firestore permission denied during ${operation}.${source} This can happen if auth is not ready yet, if the deployed Firestore rules differ from local rules, or if the user does not satisfy collection-specific rules.`;
  }

  if (code === "unauthenticated") {
    return `Not authenticated during ${operation}. Refresh auth session and try again.`;
  }

  return `Firestore ${operation} failed (${code}): ${message}`;
};

const sortPromptsForDisplay = (rows) => {
  return [...rows].sort((a, b) => {
    const ac = (a.category && String(a.category).trim()) || "";
    const bc = (b.category && String(b.category).trim()) || "";
    if (ac !== bc) {
      if (!ac) return 1;
      if (!bc) return -1;
      const byCat = ac.localeCompare(bc);
      if (byCat !== 0) return byCat;
    }
    return (a.featureName || a.id).localeCompare(b.featureName || b.id);
  });
};

// ============================================
// Context + provider
// ============================================

export const PromptsManagerContext = React.createContext();

export const PromptsManagerProvider = ({ children }) => {
  const {
    user,
    userData,
    isGlobalAdmin,
    isRegionalAdmin,
    tokenClaims,
    organizationId,
    userLoading,
  } = useAuth();

  const regionScope = String(userData?.region || "").trim() || null;
  const debugContext = useMemo(
    () => ({
      uid: user?.uid || null,
      role: userData?.role || null,
      organizationId: organizationId || null,
      region: regionScope,
      claimAdmin: Boolean(isGlobalAdmin),
      claimStripeRole: tokenClaims?.stripeRole || null,
      claimKeys: Object.keys(tokenClaims || {}),
    }),
    [
      user?.uid,
      userData?.role,
      organizationId,
      regionScope,
      isGlobalAdmin,
      tokenClaims,
    ],
  );

  const canManageAsGlobal = Boolean(isGlobalAdmin);
  const canManageAsOrg =
    (userData?.role === "admin" || isChartmindAdminRole(userData?.role)) &&
    Boolean(organizationId);
  const canManageRegional = Boolean(isRegionalAdmin && regionScope);
  const canView = canManageAsGlobal || canManageAsOrg || canManageRegional;

  const effectiveOrgId = canManageAsOrg ? organizationId : null;
  const effectiveRegionId = canManageRegional ? regionScope : null;

  const scopeKey = useMemo(
    () =>
      [
        canView ? "1" : "0",
        canManageAsGlobal ? "g" : "",
        effectiveOrgId || "",
        effectiveRegionId || "",
      ].join("|"),
    [canView, canManageAsGlobal, effectiveOrgId, effectiveRegionId],
  );

  const debugContextRef = useRef(debugContext);
  debugContextRef.current = debugContext;

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await promptRegistryService.listAll({
        organizationId: effectiveOrgId,
        regionId: effectiveRegionId,
        isGlobalAdmin: canManageAsGlobal,
      });
      setPrompts(rows);
    } catch (err) {
      const friendly = formatFirestoreError(err, "load");
      console.error("[PromptsManager] Load failed", {
        code: err?.code,
        message: err?.message,
        source: err?.promptRegistrySource || null,
        debug: err?.promptRegistryDebug || null,
        stack: err?.stack,
        authContext: debugContextRef.current,
      });
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, effectiveRegionId, canManageAsGlobal]);

  useEffect(() => {
    if (userLoading) return;
    if (!canView) {
      setPrompts([]);
      setError(null);
      setLoading(false);
      return;
    }
    loadPrompts();
  }, [userLoading, canView, scopeKey, loadPrompts]);

  const savePrompt = useCallback(
    async ({ id, updates, reason = null, actorUid, actorEmail = null }) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await promptRegistryService.updatePrompt({
          id,
          updates,
          reason,
          actorUid,
          actorEmail,
          organizationId: effectiveOrgId,
          regionId: effectiveRegionId,
          isGlobalAdmin: canManageAsGlobal,
        });
        setPrompts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        return updated;
      } catch (err) {
        const friendly = formatFirestoreError(err, "save");
        console.error("[PromptsManager] Save failed", {
          code: err?.code,
          message: err?.message,
          source: err?.promptRegistrySource || null,
          debug: err?.promptRegistryDebug || null,
          promptId: id,
          authContext: debugContextRef.current,
        });
        setError(friendly);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [effectiveOrgId, effectiveRegionId, canManageAsGlobal],
  );

  const createPrompt = useCallback(
    async ({ id, data, reason = null, actorUid, actorEmail = null }) => {
      setSaving(true);
      setError(null);
      try {
        const created = await promptRegistryService.createPrompt({
          id,
          data,
          reason,
          actorUid,
          actorEmail,
          organizationId: effectiveOrgId,
          regionId: effectiveRegionId,
          isGlobalAdmin: canManageAsGlobal,
        });
        setPrompts((current) => [created, ...current]);
        return created;
      } catch (err) {
        const friendly = formatFirestoreError(err, "create");
        console.error("[PromptsManager] Create failed", {
          code: err?.code,
          message: err?.message,
          source: err?.promptRegistrySource || null,
          debug: err?.promptRegistryDebug || null,
          promptId: id,
          authContext: debugContextRef.current,
        });
        setError(friendly);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [effectiveOrgId, effectiveRegionId, canManageAsGlobal],
  );

  const sortedPrompts = useMemo(
    () => sortPromptsForDisplay(prompts),
    [prompts],
  );

  const value = useMemo(
    () => ({
      prompts: sortedPrompts,
      loading,
      saving,
      error,
      loadPrompts,
      savePrompt,
      createPrompt,
      canView,
    }),
    [
      sortedPrompts,
      loading,
      saving,
      error,
      loadPrompts,
      savePrompt,
      createPrompt,
      canView,
    ],
  );

  return (
    <PromptsManagerContext.Provider value={value}>
      {children}
    </PromptsManagerContext.Provider>
  );
};
