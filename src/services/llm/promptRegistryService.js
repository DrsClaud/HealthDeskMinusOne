import firebase from "firebase/compat/app";
import { db } from "services/firebase";
import { LLM_COLLECTIONS } from "./llmConstants";

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
};

const SCOPES = {
  GLOBAL: "global",
  REGION: "region",
  ORG: "org",
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

/** Compare stored snapshot values for history rows and the prompt history UI. */
export function historyFieldValuesEqual(field, before, after) {
  if (field === "maxTokens") {
    return Number(before ?? 0) === Number(after ?? 0);
  }
  if (field === "temperature") {
    const b = typeof before === "number" ? before : Number.NaN;
    const a = typeof after === "number" ? after : Number.NaN;
    if (Number.isNaN(b) && Number.isNaN(a)) return true;
    if (Number.isNaN(b) || Number.isNaN(a)) return false;
    return b === a;
  }
  const bs = before == null ? "" : String(before);
  const as = after == null ? "" : String(after);
  return bs === as;
}

const getPreviousSnapshotForHistory = (previousData, field) => {
  if (hasOwn(previousData, field)) return previousData[field];
  if (field === "systemPrompt" && hasOwn(previousData, "globalPrompt")) {
    return previousData.globalPrompt;
  }
  return null;
};

const pickActuallyChangedValues = (changedValues, previousData) => {
  const out = {};
  for (const [key, nextVal] of Object.entries(changedValues || {})) {
    const prevVal = getPreviousSnapshotForHistory(previousData, key);
    if (!historyFieldValuesEqual(key, prevVal, nextVal)) {
      out[key] = nextVal;
    }
  }
  return out;
};

const buildHistoryPayload = ({
  changedValues,
  previousData = {},
  scope,
  scopeId,
  promptId,
  reason = null,
}) => {
  const actualChanges = pickActuallyChangedValues(changedValues, previousData);
  const changedFields = Object.keys(actualChanges);
  if (changedFields.length === 0) return null;

  const previousValues = changedFields.reduce((acc, field) => {
    acc[field] = getPreviousSnapshotForHistory(previousData, field);
    return acc;
  }, {});

  return {
    ...actualChanges,
    changedFields,
    previousValues,
    nextValues: { ...actualChanges },
    scope,
    scopeId,
    promptId,
    reason: typeof reason === "string" ? reason.trim() || null : null,
  };
};

const getLocalPromptDocId = ({ scope, scopeId, promptId }) =>
  `${scope}__${scopeId}__${promptId}`;

const getLocalPromptRef = ({ scope, scopeId, promptId }) =>
  db
    .collection(LLM_COLLECTIONS.LOCAL_PROMPTS)
    .doc(getLocalPromptDocId({ scope, scopeId, promptId }));

const getLocalPromptPath = ({ scope, scopeId, promptId }) =>
  `${LLM_COLLECTIONS.LOCAL_PROMPTS}/${getLocalPromptDocId({
    scope,
    scopeId,
    promptId,
  })}`;

const normalizePrompt = (
  id,
  queryData = {},
  organizationLayer = {},
  globalLayer = {},
  regionalLayer = {},
) => ({
  id,
  featureName: queryData.featureName || id,
  featureDescription: queryData.featureDescription || "",
  category: queryData.category || "unknown",
  contextSummary: queryData.contextSummary || "",
  prompt:
    organizationLayer.organizationPrompt || organizationLayer.prompt || "",
  organizationPrompt:
    organizationLayer.organizationPrompt || organizationLayer.prompt || "",
  regionalPrompt: regionalLayer.regionalPrompt || regionalLayer.prompt || "",
  systemPrompt: globalLayer.systemPrompt || globalLayer.globalPrompt || "",
  responseFormat: globalLayer.responseFormat || "",
  contextProvided: globalLayer.contextProvided || "",
  model: globalLayer.model || "",
  maxTokens: Number(globalLayer.maxTokens || 0),
  temperature:
    typeof globalLayer.temperature === "number" ? globalLayer.temperature : 0.7,
  source: "firestore",
  chainConfig: queryData.chainConfig || null,
  updatedAt:
    organizationLayer.updatedAt ||
    globalLayer.updatedAt ||
    queryData.updatedAt ||
    null,
  updatedBy:
    organizationLayer.updatedBy ||
    globalLayer.updatedBy ||
    queryData.updatedBy ||
    null,
  createdAt:
    organizationLayer.createdAt ||
    globalLayer.createdAt ||
    queryData.createdAt ||
    null,
  createdBy:
    organizationLayer.createdBy ||
    globalLayer.createdBy ||
    queryData.createdBy ||
    null,
});

const getSnapshotOrEmpty = async (promise, source) => {
  try {
    return await promise;
  } catch (error) {
    console.warn("[promptRegistryService] Optional prompt layer denied", {
      source,
      code: error?.code,
      message: error?.message,
    });
    return { docs: [] };
  }
};

const getDocOrEmptyOnPermissionDenied = async (promise, source) => {
  try {
    return await promise;
  } catch (error) {
    if (error?.code === "permission-denied") {
      console.warn("[promptRegistryService] Optional prompt doc denied", {
        source,
        code: error?.code,
        message: error?.message,
      });
      return { exists: false, data: () => ({}), __permissionDenied: true };
    }
    throw error;
  }
};

const listAll = async ({
  organizationId = null,
  regionId = null,
  isGlobalAdmin = false,
} = {}) => {
  let queryConfigSnapshot;
  try {
    queryConfigSnapshot = await db.collection(LLM_COLLECTIONS.QUERY_CONFIG).get();
  } catch (error) {
    error.promptRegistrySource = LLM_COLLECTIONS.QUERY_CONFIG;
    throw error;
  }

  const regionalQuery =
    regionId && String(regionId).trim()
      ? getSnapshotOrEmpty(
          db
            .collection(LLM_COLLECTIONS.LOCAL_PROMPTS)
            .where("scope", "==", SCOPES.REGION)
            .where("scopeId", "==", String(regionId).trim())
            .get(),
          `${LLM_COLLECTIONS.LOCAL_PROMPTS}:region:${regionId}`,
        )
      : Promise.resolve({ docs: [] });

  const [orgPromptSnapshot, globalPromptSnapshot, regionalPromptSnapshot] =
    await Promise.all([
      organizationId
        ? getSnapshotOrEmpty(
            db
              .collection(LLM_COLLECTIONS.LOCAL_PROMPTS)
              .where("scope", "==", SCOPES.ORG)
              .where("scopeId", "==", organizationId)
              .get(),
            `${LLM_COLLECTIONS.LOCAL_PROMPTS}:org:${organizationId}`,
          )
        : Promise.resolve({ docs: [] }),
      isGlobalAdmin
        ? getSnapshotOrEmpty(
            db.collection(LLM_COLLECTIONS.GLOBAL_PROMPTS).get(),
            LLM_COLLECTIONS.GLOBAL_PROMPTS,
          )
        : Promise.resolve({ docs: [] }),
      regionalQuery,
    ]);

  const queryMap = new Map(
    queryConfigSnapshot.docs.map((doc) => [doc.id, doc.data()]),
  );
  const orgMap = new Map(
    orgPromptSnapshot.docs.map((doc) => [
      doc.data()?.promptId || doc.id,
      doc.data(),
    ]),
  );
  const globalMap = new Map(
    globalPromptSnapshot.docs.map((doc) => [doc.id, doc.data()]),
  );
  const regionalMap = new Map(
    regionalPromptSnapshot.docs.map((doc) => [
      doc.data()?.promptId || doc.id,
      doc.data(),
    ]),
  );

  const promptIds = new Set([
    ...Array.from(queryMap.keys()),
    ...Array.from(orgMap.keys()),
    ...Array.from(globalMap.keys()),
    ...Array.from(regionalMap.keys()),
  ]);

  return Array.from(promptIds).map((id) =>
    normalizePrompt(
      id,
      queryMap.get(id),
      orgMap.get(id),
      globalMap.get(id),
      regionalMap.get(id),
    ),
  );
};

const upsertPrompt = async ({
  promptId,
  updates,
  reason = null,
  actorUid,
  actorEmail = null,
  organizationId = null,
  regionId = null,
  isGlobalAdmin = false,
}) => {
  const queryRef = db.collection(LLM_COLLECTIONS.QUERY_CONFIG).doc(promptId);
  const globalRef = db.collection(LLM_COLLECTIONS.GLOBAL_PROMPTS).doc(promptId);
  const orgPromptRef = organizationId
    ? getLocalPromptRef({
        scope: SCOPES.ORG,
        scopeId: organizationId,
        promptId,
      })
    : null;
  const trimmedRegionId = regionId && String(regionId).trim();
  const regionalPromptRef = trimmedRegionId
    ? getLocalPromptRef({
        scope: SCOPES.REGION,
        scopeId: trimmedRegionId,
        promptId,
      })
    : null;

  const [existingQuery, existingGlobal, existingOrgPrompt, existingRegional] =
    await Promise.all([
      queryRef.get(),
      isGlobalAdmin
        ? globalRef.get()
        : Promise.resolve({ exists: false, data: () => ({}) }),
      orgPromptRef
        ? getDocOrEmptyOnPermissionDenied(
            orgPromptRef.get(),
            `${LLM_COLLECTIONS.LOCAL_PROMPTS}:doc:${organizationId}:${promptId}`,
          )
        : Promise.resolve({ exists: false, data: () => ({}) }),
      regionalPromptRef
        ? getDocOrEmptyOnPermissionDenied(
            regionalPromptRef.get(),
            `${LLM_COLLECTIONS.LOCAL_PROMPTS}:region:${trimmedRegionId}:${promptId}`,
          )
        : Promise.resolve({ exists: false, data: () => ({}) }),
    ]);

  const writeOps = [];
  const now = firebase.firestore.FieldValue.serverTimestamp();
  let callerUserDocDebug = null;

  if (actorUid) {
    try {
      const callerUserDoc = await db.collection("users").doc(actorUid).get();
      callerUserDocDebug = callerUserDoc.exists
        ? {
            exists: true,
            role: callerUserDoc.data()?.role || null,
            organizationId: callerUserDoc.data()?.organizationId || null,
            admin: callerUserDoc.data()?.admin === true,
          }
        : { exists: false };
    } catch (error) {
      callerUserDocDebug = {
        exists: null,
        errorCode: error?.code || "unknown",
        errorMessage: error?.message || "Failed to read users/{uid}",
      };
    }
  }
  const organizationPrompt =
    typeof updates.organizationPrompt === "string"
      ? updates.organizationPrompt
      : typeof updates.prompt === "string"
        ? updates.prompt
        : undefined;

  const regionalPrompt =
    typeof updates.regionalPrompt === "string"
      ? updates.regionalPrompt
      : undefined;

  if (isGlobalAdmin) {
    const queryPayload = {};
    if (typeof updates.featureName === "string") {
      queryPayload.featureName = updates.featureName;
    }
    if (typeof updates.featureDescription === "string") {
      queryPayload.featureDescription = updates.featureDescription;
    }
    if (typeof updates.category === "string") {
      queryPayload.category = updates.category;
    }
    if (typeof updates.contextSummary === "string") {
      queryPayload.contextSummary = updates.contextSummary;
    }
    if (updates.chainConfig && typeof updates.chainConfig === "object") {
      queryPayload.chainConfig = updates.chainConfig;
    }
    if (Object.keys(queryPayload).length > 0 || !existingQuery.exists) {
      writeOps.push({
        source: `${LLM_COLLECTIONS.QUERY_CONFIG}:${promptId}`,
        debug: {
          action: existingQuery.exists ? "update" : "create",
          path: `${LLM_COLLECTIONS.QUERY_CONFIG}/${promptId}`,
          payload: {
            ...queryPayload,
            id: promptId,
            updatedBy: actorUid || null,
            ...(existingQuery.exists
              ? {}
              : { createdBy: actorUid || null }),
          },
        },
        run: () =>
          queryRef.set(
            {
              ...queryPayload,
              id: promptId,
              updatedBy: actorUid || null,
              updatedAt: now,
              ...(existingQuery.exists
                ? {}
                : { createdBy: actorUid || null, createdAt: now }),
            },
            { merge: true },
          ),
      });
    }

    const globalPayload = {};
    if (typeof updates.systemPrompt === "string") {
      globalPayload.systemPrompt = updates.systemPrompt;
    }
    if (typeof updates.contextProvided === "string") {
      globalPayload.contextProvided = updates.contextProvided;
    }
    if (typeof updates.responseFormat === "string") {
      globalPayload.responseFormat = updates.responseFormat;
    }
    if (typeof updates.model === "string") {
      globalPayload.model = updates.model;
    }
    if (typeof updates.maxTokens === "number") {
      globalPayload.maxTokens = updates.maxTokens;
    }
    if (typeof updates.temperature === "number") {
      globalPayload.temperature = updates.temperature;
    }

    if (Object.keys(globalPayload).length > 0 || !existingGlobal.exists) {
      writeOps.push({
        ref: globalRef,
        historyPayload: buildHistoryPayload({
          changedValues: globalPayload,
          previousData: existingGlobal.exists ? existingGlobal.data() : {},
          scope: SCOPES.GLOBAL,
          scopeId: "default",
          promptId,
          reason,
        }),
        source: `${LLM_COLLECTIONS.GLOBAL_PROMPTS}:${promptId}`,
        debug: {
          action: existingGlobal.exists ? "update" : "create",
          path: `${LLM_COLLECTIONS.GLOBAL_PROMPTS}/${promptId}`,
          payload: {
            ...globalPayload,
            scope: SCOPES.GLOBAL,
            scopeId: "default",
            promptId,
            updatedBy: actorUid || null,
            ...(existingGlobal.exists
              ? {}
              : { createdBy: actorUid || null }),
          },
        },
        run: () =>
          globalRef.set(
            {
              ...globalPayload,
              scope: SCOPES.GLOBAL,
              scopeId: "default",
              promptId,
              updatedBy: actorUid || null,
              updatedAt: now,
              ...(existingGlobal.exists
                ? {}
                : { createdBy: actorUid || null, createdAt: now }),
            },
            { merge: true },
          ),
      });
    }
  }

  if (orgPromptRef && typeof organizationPrompt === "string") {
    writeOps.push({
      ref: orgPromptRef,
      historyPayload: buildHistoryPayload({
        changedValues: { organizationPrompt },
        previousData: existingOrgPrompt.exists ? existingOrgPrompt.data() : {},
        scope: SCOPES.ORG,
        scopeId: organizationId,
        promptId,
        reason,
      }),
      source: `${LLM_COLLECTIONS.LOCAL_PROMPTS}:${SCOPES.ORG}:${organizationId}:${promptId}`,
      debug: {
        action: existingOrgPrompt.exists
          ? "update"
          : existingOrgPrompt.__permissionDenied
            ? "create-or-update (pre-read denied)"
            : "create",
        path: getLocalPromptPath({
          scope: SCOPES.ORG,
          scopeId: organizationId,
          promptId,
        }),
        callerUserDoc: callerUserDocDebug,
        payload: {
          scope: SCOPES.ORG,
          scopeId: organizationId,
          promptId,
          layer: "organization",
          prompt: organizationPrompt,
          organizationPrompt,
          updatedBy: actorUid || null,
          ...(existingOrgPrompt.exists
            ? {}
            : { createdBy: actorUid || null }),
        },
      },
      run: () =>
        orgPromptRef.set(
          {
            scope: SCOPES.ORG,
            scopeId: organizationId,
            promptId,
            layer: "organization",
            prompt: organizationPrompt,
            organizationPrompt,
            updatedBy: actorUid || null,
            updatedAt: now,
            ...(existingOrgPrompt.exists
              ? {}
              : { createdBy: actorUid || null, createdAt: now }),
          },
          { merge: true },
        ),
    });
  }

  if (
    regionalPromptRef &&
    regionalPrompt !== undefined &&
    !isGlobalAdmin
  ) {
    writeOps.push({
      ref: regionalPromptRef,
      historyPayload: buildHistoryPayload({
        changedValues: { regionalPrompt },
        previousData: existingRegional.exists ? existingRegional.data() : {},
        scope: SCOPES.REGION,
        scopeId: trimmedRegionId,
        promptId,
        reason,
      }),
      source: `${LLM_COLLECTIONS.LOCAL_PROMPTS}:${SCOPES.REGION}:${trimmedRegionId}:${promptId}`,
      debug: {
        action: existingRegional.exists
          ? "update"
          : existingRegional.__permissionDenied
            ? "create-or-update (pre-read denied)"
            : "create",
        path: getLocalPromptPath({
          scope: SCOPES.REGION,
          scopeId: trimmedRegionId,
          promptId,
        }),
        callerUserDoc: callerUserDocDebug,
        payload: {
          scope: SCOPES.REGION,
          scopeId: trimmedRegionId,
          promptId,
          layer: "regional",
          prompt: regionalPrompt,
          regionalPrompt,
          updatedBy: actorUid || null,
          ...(existingRegional.exists
            ? {}
            : { createdBy: actorUid || null }),
        },
      },
      run: () =>
        regionalPromptRef.set(
          {
            scope: SCOPES.REGION,
            scopeId: trimmedRegionId,
            promptId,
            layer: "regional",
            prompt: regionalPrompt,
            regionalPrompt,
            updatedBy: actorUid || null,
            updatedAt: now,
            ...(existingRegional.exists
              ? {}
              : { createdBy: actorUid || null, createdAt: now }),
          },
          { merge: true },
        ),
    });
  }

  if (!writeOps.length) {
    throw new Error("No valid prompt updates were provided for your role.");
  }

  for (const op of writeOps) {
    try {
      await op.run();
    } catch (error) {
      error.promptRegistrySource = op.source;
      error.promptRegistryDebug = op.debug;
      throw error;
    }
  }

  // Write history entries (fire-and-forget; never block the save)
  const historyTimestamp = firebase.firestore.FieldValue.serverTimestamp();
  Promise.all(
    writeOps
      .filter((op) => op.ref && op.historyPayload)
      .map((op) =>
        op.ref
          .collection("history")
          .add({
            ...op.historyPayload,
            changedBy: actorUid || null,
            changedByEmail: actorEmail || null,
            changedAt: historyTimestamp,
          })
          .catch((err) =>
            console.warn("[promptRegistryService] history write failed", op.source, err),
          ),
      ),
  );

  const [freshQuery, freshGlobal, freshOrgPrompt, freshRegional] =
    await Promise.all([
      queryRef.get(),
      isGlobalAdmin
        ? globalRef.get()
        : Promise.resolve({ exists: false, data: () => ({}) }),
      orgPromptRef
        ? orgPromptRef.get()
        : Promise.resolve({ exists: false, data: () => ({}) }),
      regionalPromptRef
        ? regionalPromptRef.get()
        : Promise.resolve({ exists: false, data: () => ({}) }),
    ]);

  return normalizePrompt(
    promptId,
    freshQuery.exists ? freshQuery.data() : {},
    freshOrgPrompt.exists ? freshOrgPrompt.data() : {},
    freshGlobal.exists ? freshGlobal.data() : {},
    freshRegional.exists ? freshRegional.data() : {},
  );
};

const getGlobalPrompt = async ({ promptId }) => {
  const doc = await db
    .collection(LLM_COLLECTIONS.GLOBAL_PROMPTS)
    .doc(promptId)
    .get();
  if (!doc.exists) return null;
  return {
    id: doc.id,
    ...doc.data(),
  };
};

const upsertGlobalPrompt = async ({
  promptId,
  systemPrompt,
  contextProvided,
  responseFormat,
  model,
  maxTokens,
  temperature,
  actorUid,
}) => {
  const ref = db.collection(LLM_COLLECTIONS.GLOBAL_PROMPTS).doc(promptId);
  const existing = await ref.get();
  const payload = {
    scope: SCOPES.GLOBAL,
    scopeId: "default",
    promptId,
    ...(typeof systemPrompt === "string" ? { systemPrompt } : {}),
    ...(typeof contextProvided === "string" ? { contextProvided } : {}),
    ...(typeof responseFormat === "string" ? { responseFormat } : {}),
    ...(typeof model === "string" ? { model } : {}),
    ...(typeof maxTokens === "number" ? { maxTokens } : {}),
    ...(typeof temperature === "number" ? { temperature } : {}),
    updatedBy: actorUid || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!existing.exists) {
    payload.createdBy = actorUid || null;
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
  const fresh = await ref.get();
  return {
    id: fresh.id,
    ...fresh.data(),
  };
};

const createPrompt = async ({
  id,
  data,
  reason = null,
  actorUid,
  actorEmail = null,
  organizationId = null,
  regionId = null,
  isGlobalAdmin = false,
}) => {
  const promptId = (id || "").trim();
  if (!promptId) {
    throw new Error("Prompt ID is required.");
  }
  return upsertPrompt({
    promptId,
    updates: data,
    reason,
    actorUid,
    actorEmail,
    organizationId,
    regionId,
    isGlobalAdmin,
  });
};

const updatePrompt = ({
  id,
  updates,
  reason = null,
  actorUid,
  actorEmail = null,
  organizationId = null,
  regionId = null,
  isGlobalAdmin = false,
}) => {
  return upsertPrompt({
    promptId: id,
    updates,
    reason,
    actorUid,
    actorEmail,
    organizationId,
    regionId,
    isGlobalAdmin,
  });
};

const getPromptHistory = async ({ promptId, scope = "global", scopeId = null, limit = 20 }) => {
  let ref;
  if (scope === "global") {
    ref = db.collection(LLM_COLLECTIONS.GLOBAL_PROMPTS).doc(promptId);
  } else {
    const docId = getLocalPromptDocId({ scope, scopeId, promptId });
    ref = db.collection(LLM_COLLECTIONS.LOCAL_PROMPTS).doc(docId);
  }
  const snap = await ref
    .collection("history")
    .orderBy("changedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const promptRegistryService = {
  listAll,
  createPrompt,
  updatePrompt,
  getGlobalPrompt,
  upsertGlobalPrompt,
  getPromptHistory,
  toMillis,
};

export default promptRegistryService;
