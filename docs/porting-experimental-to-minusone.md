---
doc_id: porting-experimental-to-minusone
title: Porting roles and features from Experimental to MinusOne
summary: Canonical runbook whenever code or behavior moves from HealthDesk-Experimental into HealthDeskMinusOne.
keywords:
  - porting-experimental-to-minusone
  - experimental-to-minusone
  - HealthDesk-Experimental
  - hlthdsk-experimental
---

# Porting roles and features from Experimental to MinusOne

**When to use this doc:** Any time you bring a **role**, **route**, **dashboard behavior**, **allowlist**, **Firestore shape**, or **Cloud Function** from **HealthDesk-Experimental** into **HealthDeskMinusOne** (this app).

**Canonical location:** `docs/porting-experimental-to-minusone.md` (this file).  
**Discoverability:** Linked from [ENGINEERING.md](./ENGINEERING.md) and [.cursor/rules/migration.mdc](../.cursor/rules/migration.mdc). For issues/PRs, use labels or titles that include **`porting-experimental-to-minusone`** or **`Experimental→MinusOne`** so search stays consistent.

---

## Naming and repo layout

| Item | Convention |
|------|------------|
| **This runbook** | `porting-experimental-to-minusone.md` — kebab-case, grep-friendly (`experimental`, `minusone`, `porting`). |
| **Experimental tree in this workspace** | Folder **`HealthDesk-Experimental/`** is a **sibling** of this package at the **Cursor workspace root** (Windows **junction** / symlink to your local Experimental clone). Application source: **`HealthDesk-Experimental/healthdesk-monorepo/`**. From this package, that is **`../HealthDesk-Experimental/`**. |
| **MinusOne app (this package)** | The folder that contains **`docs/`**, **`src/`**, **`firebase/`**, **`functions/`** (the HealthDesk MinusOne React app you are editing). |
| **Experimental Firebase project (typical)** | **`hlthdsk-experimental`** (see Experimental env and `REACT_APP_FIREBASE_PROJECT_ID`). |
| **MinusOne Firebase projects** | See **`.firebaserc`** and env files (e.g. sandbox `hlthdsk-sandbox-2cc23`, prod `hlthdsk`). |

---

## 1. Clarify scope: role vs feature

| Kind | “Done” means |
|------|----------------|
| **Role** (e.g. `p4`, `p2`, `student`) | `users.role` (and **custom claims** if used) are set; **Firestore rules** allow required access; **routing + guards** send users to the right place; **Functions** that branch on role behave correctly. |
| **Feature** (page, lab, modal, API) | **Routes**, **entry points** (drawer, tiles), **data paths** (Firestore/HTTP), **rules**, and **Functions** are aligned. |

Most ports touch **both**: a role without routing is useless; a route without rules may fail at runtime.

---

## 2. Discovery pass (Experimental, read-only)

1. **Name the artifact** — Exact strings: `users.role`, JWT claim, `allowedViewingRoles`, feature flag, collection name.
2. **Search Experimental** under `HealthDesk-Experimental/healthdesk-monorepo/`:
   - **`apps/unified-app/src`** — routes, pages, hooks, config.
   - **`packages/shared-*`** — shared UI/services.
   - **`functions/functions/src`** — callables, HTTP, triggers, Auth.
3. **Trace journeys** — After login: **redirects**, **`RoleGuard`** (or equivalent) **allowlists**, deep links.
4. **List data dependencies** — Collections, indexes, Storage, Secret Manager keys referenced in code.
5. **Note env / host checks** — `REACT_APP_*`, `hlthdsk-experimental.web.app`, demo hosts, localhost.

**Deliverable:** A small table — *path → responsibility* (route / rule / function / constant).

---

## 3. Port routing

Experimental patient-family routing is centered on **`PatientRoutes.jsx`** and related layout. MinusOne has its own **`src/routes/PatientRoutes.jsx`**; structure and role matrix may differ.

1. **Map** Experimental: path, component, **allowed roles**, default **redirects** (e.g. role `p4` → `/dashboard/p4`).
2. **Decide parity** — Full parity, subset, or N/A for MinusOne.
3. **Implement** in MinusOne:
   - Add/extend **React Router** routes under the same `/dashboard/...` prefix MinusOne uses.
   - Reuse or add a **route guard** (deny / redirect when `userData.role` ∉ allowlist).
   - Align **post-auth landing** per role (mirror Experimental intentionally).

4. **Navigation chrome** — Drawer / app bar / tabs: labels and `to=` paths (e.g. “P4 Workspace”, `/dashboard/p4`). Port **iOS parallel** components if MinusOne splits them.

---

## 4. Port dashboard branches

Find Experimental conditionals: `userData?.role`, `effectiveRole`, `role ===`, feature flags.

1. **Dashboard entry** — `DashboardPage.jsx` and related: tiles, redirects, banners for the new role.
2. **Contexts** — e.g. **`LLMManagerContext.jsx`**: `allowedViewingRoles` and manager checks; extend only if product matches Experimental.
3. **Feature-specific pages** — Pricing, Settings (hide sections per role), Chat layout, check-in, workspaces.

**After changes:** Grep MinusOne for **`patient`**-only assumptions on code paths the new role uses; fix mismatches.

---

## 5. Port allowlists (client, Functions, Firestore rules)

Allowlists exist in **three layers**; keep them consistent.

### 5.1 Client

- Route guards: arrays like `['patient', 'p2', 'p4']`.
- Feature constants: `PATIENT_ROLES`, lab access sets, admin UI defaults.
- Prefer a **single shared constants module** in MinusOne when adding multiple sites.

### 5.2 Cloud Functions

Search Experimental `functions/functions/src` for `role`, `request.auth`, Firestore `users/` reads.

- Port or reimplement under MinusOne **`functions/`** with the same **authorization** (prefer server-verified role from Firestore or claims, not trusting client body alone).
- Align **region**, **URLs**, and **env** the frontend uses to call functions.

### 5.3 Firestore security rules

MinusOne **`firebase/firestore.rules`**:

- **`users` create** — Whitelist includes which roles may be set on **self-registration**; extend only if product requires (today includes `patient`, `facility`, `professional`, `admin`; other roles often require **Admin SDK** or trusted callables).
- **Self-update** — Users cannot change their own `role` / `admin` client-side; privileged paths use Admin SDK or functions.
- **Other matchers** — e.g. `isPromptManager()`: extend only if the new role should access those surfaces.

Deploy rules and run any **rules tests** present; smoke-test with a dedicated test user.

### 5.4 Auth custom claims

If Experimental relies on **`request.auth.token.*`**, mirror claim-setting in MinusOne (see existing scripts such as **`scripts/setAdminClaim.js`**) and keep **claims** and **Firestore `users.role`** coherent.

---

## 6. Data model and migrations

- New **fields** on `users` or other docs: add to **creation flows**, **types** (if any), and **rules**.
- New **queries**: add **`firestore.indexes.json`** entries and deploy.
- **Backfill** existing users via **Admin SDK** batches (rules do not apply).

---

## 7. Recommended order of work

1. Finish **discovery** (section 2).
2. **Backend auth** — Functions + Firestore rules (avoid privilege escalation).
3. **Routing + guards** — Valid subtree for the role.
4. **Dashboard + nav** — Coherent UX.
5. **Feature UI** — Modals, labs, detail pages.
6. **Regression** — Other roles unchanged; lint/tests.

---

## 8. Verification checklist

- [ ] User with the new role reaches the intended **default route** after sign-in.
- [ ] **Deep link** to a restricted route **redirects** or fails safely when role is wrong.
- [ ] **Firestore** read/write matches rules for that role.
- [ ] **Functions** reject unauthorized roles; happy path works.
- [ ] No stale **`patient`-only** checks on shared paths.
- [ ] **Project / env** (sandbox vs prod) verified for Firebase and function URLs.

---

## 9. Example inventory: role `p4` (Experimental)

Illustrative sources (not exhaustive):

| Area | Experimental path (under `healthdesk-monorepo/`) |
|------|---------------------------------------------------|
| Routes / guards | `apps/unified-app/src/routes/PatientRoutes.jsx` |
| Drawer | `apps/unified-app/src/components/dashboard/layout/DrawerComponents.js` |
| Workspace copy | `apps/unified-app/src/pages/dashboard/P2WorkspacePage.jsx` |
| Brand / carousel | `apps/unified-app/src/config/brandBarRoleConfig.js` |
| Research / SC2 lab | `apps/unified-app/src/features/research/constants/researchConstants.js`, `.../symptomCheckV2/utils/sc2QuestionLabAccess.js` |
| Dashboard / news / check-in / chat | respective `pages/` and `components/` as found by search for `"p4"` |

Use the same **search-first** method for any other role or feature.

---

## Document history

| Date | Change |
|------|--------|
| 2026-04-25 | Initial runbook; canonical name `porting-experimental-to-minusone.md`. |
