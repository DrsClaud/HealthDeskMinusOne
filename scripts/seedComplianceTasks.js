#!/usr/bin/env node

/**
 * seedComplianceTasks.js
 *
 * Generates and batch-writes MD3C HIPAA operational task documents into the
 * `hipaaTasks` Firestore collection. The app uses these documents as the
 * compliance system of record — tracking status, completion timestamps,
 * responsible parties, and evidence links.
 *
 * Document IDs are deterministic (e.g. monthly-audit-log-review-2026-05), so
 * this script is safe to rerun as the schedule evolves. Existing docs are
 * merged, not overwritten — completion state is never clobbered.
 *
 * What this script does NOT do:
 *   - Send reminder emails (the sendComplianceOverdueReminders Cloud Function handles that).
 *   - Delete tasks or modify completion state on existing documents.
 *   - Create ad hoc tasks; it only generates the known recurring schedule.
 *
 * Usage:
 *   node scripts/seedComplianceTasks.js
 *
 * Requirements:
 *   - Install root dependencies first (`npm install` in the project root).
 *   - firebase-admin + date-fns available from the root `node_modules`.
 *   - A service account key file. Default: firebase-creds.json in project root (gitignored).
 *     Override: set env GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key.json
 *
 * How to get the service account key (firebase-creds.json):
 *   1. Open Firebase Console: https://console.firebase.google.com
 *   2. Select the project (must match the app's REACT_APP_FIREBASE_PROJECT_ID).
 *   3. Project settings (gear) → Service accounts.
 *   4. Click "Generate new private key" (or use an existing one).
 *   5. Save the downloaded JSON as firebase-creds.json in the project root.
 *   6. Do not commit it (it is in .gitignore). Rotate the key if it was ever committed.
 *
 * Future maintenance:
 *   When approaching RANGE_END, extend it and rerun. IDs are deterministic so
 *   extension appends new docs only — existing completion state is safe.
 */

const path = require("path");
const admin = require("firebase-admin");
const {
  addDays,
  addMonths,
  addQuarters,
  endOfQuarter,
  formatISO,
  getQuarter,
  getYear,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} = require("date-fns");

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
const credPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "../firebase-creds.json");

const serviceAccount = require(credPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const projectId = serviceAccount.project_id;
const db = admin.firestore();

// ----------------------------------------------------------------
// Schedule config
// ----------------------------------------------------------------
const RANGE_END = "2031-12-31";
const BASE_START = "2026-04-01";

// Owner labels — last names only; avoids personal data in version control.
// Update these if team membership changes; rerun to refresh Firestore.
const OWNERS = {
  murphy:        "Murphy",
  claud:         "Claud",
  mesa:          "Mesa",
  murphyClaud:   "Murphy & Claud",
  murphyMesa:    "Murphy & Mesa",
  murphyAll:     "Murphy & Claud coordinate | Murphy, Claud, Mesa complete",
  allThree:      "Murphy, Claud, Mesa",
  claudTorvik:   "Claud + Torvik",
  coveredEntity: "Covered Entity (MD3C provides data)",
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const toDate    = (isoDate) => parseISO(isoDate);
const toIsoDate = (date)    => formatISO(date, { representation: "date" });

const endDate       = toDate(RANGE_END);
const todayDate     = startOfDay(new Date());
const baseStartDate = toDate(BASE_START);
const globalStart   = isAfter(todayDate, baseStartDate) ? todayDate : baseStartDate;

const quarterLabel = (date) => `Q${getQuarter(date)} ${getYear(date)}`;

const isInWindow = (isoDate) => {
  const due = toDate(isoDate);
  return !isBefore(due, globalStart) && !isAfter(due, endDate);
};

const tasks   = [];
const taskIds = new Set();

const addTask = ({ id, title, dueDate, cadence, category, owner, policyRef }) => {
  if (!isInWindow(dueDate)) return;
  if (taskIds.has(id))      return;
  taskIds.add(id);
  tasks.push({ id, title, dueDate, cadence, category, owner, policyRef, status: "pending" });
};

// ----------------------------------------------------------------
// Schedule builders
// ----------------------------------------------------------------

/** Monthly audit log review on the 18th of every month. */
const seedMonthly = () => {
  let cursor = toDate("2026-04-18");
  while (!isAfter(cursor, endDate)) {
    const dueDate = toIsoDate(cursor);
    addTask({
      id:       `monthly-audit-log-review-${dueDate.slice(0, 7)}`,
      title:    "Monthly audit log review — GCP, Firebase, Firestore, IAM",
      dueDate,
      cadence:  "monthly",
      category: "monthly",
      owner:    OWNERS.murphyClaud,
      policyRef: "POL-006",
    });
    cursor = addMonths(cursor, 1);
  }
};

/** Four quarterly tasks per quarter-end, starting Q2 2026 (Q1 2026 omitted — launch window). */
const quarterlyTemplates = [
  {
    id:            "quarterly-access-review",
    titleTemplate: "{Q} Quarterly Access Review — verify accounts, revoke orphaned permissions",
    owner:         OWNERS.murphyClaud,
    policyRef:     "POL-005",
  },
  {
    id:            "quarterly-risk-register-review",
    titleTemplate: "{Q} Risk Register Review — update risk statuses, close resolved risks",
    owner:         OWNERS.murphyClaud,
    policyRef:     "POL-009",
  },
  {
    id:            "quarterly-baa-registry-review",
    titleTemplate: "{Q} BAA Registry Review",
    owner:         OWNERS.murphy,
    policyRef:     "POL-004",
  },
  {
    id:            "quarterly-device-inventory-review",
    titleTemplate: "{Q} Device Inventory Review — verify compliance of all authorized devices",
    owner:         OWNERS.murphy,
    policyRef:     "POL-007",
  },
];

const seedQuarterly = () => {
  let anchor = toDate("2026-04-01");
  while (!isAfter(anchor, endDate)) {
    const dueObj  = endOfQuarter(anchor);
    const dueDate = toIsoDate(dueObj);
    const q       = quarterLabel(dueObj);
    quarterlyTemplates.forEach((t) => {
      addTask({
        id:       `${t.id}-${dueDate}`,
        title:    t.titleTemplate.replace("{Q}", q),
        dueDate,
        cadence:  "quarterly",
        category: "quarterly",
        owner:    t.owner,
        policyRef: t.policyRef,
      });
    });
    anchor = addQuarters(anchor, 1);
  }
};

/** Ten annual tasks due March 30 each year (2027–2031). */
const annualMarch30Templates = [
  {
    id:       "annual-hipaa-training",
    title:    "Annual HIPAA training — ALL workforce members complete by March 30",
    owner:    OWNERS.murphyAll,
    policyRef: "POL-010",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-policy-review-17",
    title:    "Review and re-approve all 17 policies — update effective dates, version history",
    owner:    OWNERS.murphyClaud,
    policyRef: "All POLs",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-aup-reacknowledgment",
    title:    "Re-acknowledge AUP (POL-002-AUP-ATT-A) — all 3 workforce members",
    owner:    OWNERS.allThree,
    policyRef: "POL-002-AUP",
    category: "training",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-risk-analysis-complete",
    title:    "Complete annual Risk Analysis; update Risk Register (POL-009-ATT-A)",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-009",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-disposal-review",
    title:    "Annual disposal review — identify any PHI meeting retention period",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-014",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-ropa-soc-iso",
    title:    "Update ROPA per GDPR Article 30(2); download and retain Google SOC 2 Type II and ISO 27001 reports",
    owner:    OWNERS.murphy,
    policyRef: "POL-015, POL-016",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-verify-mfa-all-accounts",
    title:    "Verify MFA enforcement for all workforce accounts in Google Workspace Admin Console",
    owner:    OWNERS.murphy,
    policyRef: "POL-002",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-google-hipaa-services-list",
    title:    "Review Google's HIPAA-covered services list; verify compliance",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-016",
    category: "annual",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-dpo-torvik-consultation",
    title:    "DPO assessment consultation with Torvik Law LLC",
    owner:    OWNERS.claudTorvik,
    policyRef: "POL-016",
    category: "legal",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-apac-cross-border-review",
    title:    "Review APAC cross-border transfer mechanisms for adequacy",
    owner:    OWNERS.claudTorvik,
    policyRef: "POL-016",
    category: "legal",
    years:    [2027, 2028, 2029, 2030, 2031],
  },
  {
    id:       "annual-retention-inventory-prep-2032",
    title:    "Begin preparing 6-year retention inventory — first records eligible for disposal in 2032",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-014",
    category: "annual",
    years:    [2029],
  },
];

const seedAnnualMarch30 = () => {
  annualMarch30Templates.forEach((t) => {
    t.years.forEach((year) => {
      addTask({
        id:       `${t.id}-${year}`,
        title:    t.title,
        dueDate:  `${year}-03-30`,
        cadence:  "annual",
        category: t.category,
        owner:    t.owner,
        policyRef: t.policyRef,
      });
    });
  });
};

/** HHS sub-500 breach report due March 1 (years 2027–2031). */
const seedAnnualMarch1 = () => {
  [2027, 2028, 2029, 2030, 2031].forEach((year) => {
    addTask({
      id:       `hhs-annual-breach-report-sub500-${year}`,
      title:    "HHS Annual Breach Report due March 1 (for any sub-500 breaches in prior calendar year)",
      dueDate:  `${year}-03-01`,
      cadence:  "annual",
      category: "legal",
      owner:    OWNERS.coveredEntity,
      policyRef: "POL-003",
    });
  });
};

/** Three annual tasks due September 30 (years 2027–2031). */
const annualSep30Templates = [
  {
    id:       "annual-tabletop-incident-exercise",
    title:    "Annual Tabletop Incident Response Exercise — simulate realistic scenario; document results",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-012",
  },
  {
    id:       "annual-backup-restoration-test",
    title:    "Annual Backup Restoration Test — restore Firestore backup; verify integrity; document",
    owner:    OWNERS.murphyMesa,
    policyRef: "POL-013",
  },
  {
    id:       "annual-dr-plan-test",
    title:    "Annual DR Plan Test — simulate disaster; test recovery; document",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-013",
  },
];

const seedAnnualSep30 = () => {
  [2027, 2028, 2029, 2030, 2031].forEach((year) => {
    annualSep30Templates.forEach((t) => {
      addTask({
        id:       `${t.id}-${year}`,
        title:    t.title,
        dueDate:  `${year}-09-30`,
        cadence:  "annual",
        category: "annual",
        owner:    t.owner,
        policyRef: t.policyRef,
      });
    });
  });
};

/** GCP/Firebase credential rotation every 90 days, anchored at 2026-06-30. */
const seedEvery90Days = () => {
  let cursor = toDate("2026-06-30");
  while (!isAfter(cursor, endDate)) {
    const dueDate = toIsoDate(cursor);
    addTask({
      id:       `rotate-gcp-firebase-credentials-${dueDate}`,
      title:    "Rotate GCP service account keys and Firebase credentials (90-day cycle)",
      dueDate,
      cadence:  "every90days",
      category: "legal",
      owner:    OWNERS.murphyMesa,
      policyRef: "POL-002",
    });
    cursor = addDays(cursor, 90);
  }
};

/** Legal template reviews every two years (odd years: 2027, 2029, 2031). */
const seedBiennialDecember = () => {
  [
    {
      id:       "biennial-baa-template-torvik",
      title:    "BAA template legal review — Torvik Law LLC (every 2 years)",
      policyRef: "POL-004",
    },
    {
      id:       "biennial-gdpr-dpa-template-torvik",
      title:    "GDPR DPA template legal review — Torvik Law LLC (every 2 years)",
      policyRef: "POL-016",
    },
  ].forEach((t) => {
    [2027, 2029, 2031].forEach((year) => {
      addTask({
        id:       `${t.id}-${year}`,
        title:    t.title,
        dueDate:  `${year}-12-15`,
        cadence:  "biennial",
        category: "legal",
        owner:    OWNERS.claudTorvik,
        policyRef: t.policyRef,
      });
    });
  });
};

/** One-off far-future milestones tied to the 2032 records retention deadline. */
const seedMilestones = () => {
  addTask({
    id:       "milestone-retention-prep-2030",
    title:    "Begin active preparation for 2032 first HIPAA records disposal — verify retention periods, identify data for disposal",
    dueDate:  "2030-12-15",
    cadence:  "oneoff",
    category: "annual",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-014",
  });

  addTask({
    id:       "milestone-prepare-2032-disposal",
    title:    "PREPARE FOR 2032 DISPOSAL: Complete retention inventory; identify all records from 2026 eligible for disposal on March 30, 2032; prepare disposal plan and notify Covered Entity clients where required",
    dueDate:  "2031-12-31",
    cadence:  "oneoff",
    category: "annual",
    owner:    OWNERS.murphyClaud,
    policyRef: "POL-014",
  });
};

/** Populate in-memory task list from all schedule builders. */
const buildTasks = () => {
  seedMonthly();
  seedQuarterly();
  seedAnnualMarch1();
  seedAnnualMarch30();
  seedAnnualSep30();
  seedEvery90Days();
  seedBiennialDecember();
  seedMilestones();
};

// ----------------------------------------------------------------
// Firestore write
// ----------------------------------------------------------------
async function writeInBatches(collectionName, docs, chunkSize = 450) {
  let written = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((doc) => {
      const { id, ...payload } = doc;
      batch.set(db.collection(collectionName).doc(id), payload, { merge: true });
    });
    await batch.commit();
    written += chunk.length;
    console.log(`  Committed ${written}/${docs.length}`);
  }
}

// ----------------------------------------------------------------
// Run
// ----------------------------------------------------------------
buildTasks();

async function run() {
  console.log(`\nSeeding ${tasks.length} HIPAA tasks → project "${projectId}"`);
  await writeInBatches("hipaaTasks", tasks);
  console.log(`\n✓ Seeding complete.`);
  console.log(`  Project: ${projectId} (must match your app's REACT_APP_FIREBASE_PROJECT_ID)`);
  console.log(`  Safe to rerun — existing completion state is never modified.`);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
