const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const { getRuntimeConfig } = require("../runtimeConfig");

/**
 * Returns the owner→email map from RUNTIME_CONFIG.complianceEmails.
 * Expected shape:
 *   { "murphy": ["eric@example.com"], "claud": ["dr@example.com"], ... }
 */
function getOwnerEmailMap() {
  const config = getRuntimeConfig();
  return config.complianceEmails || {};
}

const OVERDUE_STATUSES = new Set(["pending", "in-progress"]);

const normalize = (value) => String(value || "").toLowerCase();

const toIsoDate = (date) => date.toISOString().slice(0, 10);

function resolveRecipients(owner) {
  const o = normalize(owner);
  const ownerEmailMap = getOwnerEmailMap();
  const recipients = new Set();

  Object.entries(ownerEmailMap).forEach(([key, emails]) => {
    if (o.includes(normalize(key))) {
      (Array.isArray(emails) ? emails : [emails]).forEach((email) => {
        if (email) recipients.add(email);
      });
    }
  });

  return Array.from(recipients);
}

function buildReminderEmail(task) {
  const dueDate = task.dueDate;
  const appUrl = process.env.APP_URL || "https://myhealthdesk.com";
  const dashboardUrl = `${appUrl}/dashboard/admin/hipaa-compliance`;
  const subject = `[Compliance] Overdue task: ${task.title}`;

  return {
    subject,
    text: [
      "HIPAA compliance task is overdue.",
      `Task: ${task.title}`,
      `Due date: ${dueDate}`,
      `Owner: ${task.owner || "n/a"}`,
      `Open: ${dashboardUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px;">
        <h2>HIPAA compliance task overdue</h2>
        <p><strong>Task:</strong> ${task.title}</p>
        <p><strong>Due date:</strong> ${dueDate}</p>
        <p><strong>Owner:</strong> ${task.owner || "n/a"}</p>
        <p><a href="${dashboardUrl}">Open HIPAA Compliance page</a></p>
      </div>
    `,
  };
}

async function sendComplianceOverdueReminders() {
  const todayIso = toIsoDate(new Date());

  const snapshot = await db
    .collection("hipaaTasks")
    .where("dueDate", "<", todayIso)
    .get();

  if (snapshot.empty) {
    functions.logger.info("No overdue compliance tasks found.");
    return null;
  }

  let sentCount = 0;

  for (const doc of snapshot.docs) {
    const task = doc.data();

    if (!OVERDUE_STATUSES.has(task.status || "pending")) continue;
    if (task.overdueReminderSentOn) continue;

    const to = resolveRecipients(task.owner);
    if (to.length === 0) {
      functions.logger.warn(
        "No recipients resolved for overdue compliance task.",
        {
          taskId: doc.id,
          owner: task.owner || null,
        },
      );
      continue;
    }

    const message = buildReminderEmail(task);

    await db.collection("emails").add({
      to,
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "compliance_overdue_reminder",
      taskId: doc.id,
      dueDate: task.dueDate,
    });

    await doc.ref.set(
      {
        overdueReminderSentOn: todayIso,
        overdueReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    sentCount += 1;
  }

  functions.logger.info("Processed overdue compliance reminder pass.", {
    checked: snapshot.size,
    sent: sentCount,
  });

  return null;
}

module.exports = { sendComplianceOverdueReminders };
