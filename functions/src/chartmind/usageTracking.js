const functions = require("firebase-functions/v1");

const { admin, db } = require("../config/firebase");

const CHARTMIND_COMPLETED_STEP = "chart";

function getDateKey(timestamp) {
  const date = timestamp.toDate();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return {
    dateKey: `${year}-${month}-${day}`,
    yearMonth: `${year}-${month}`,
    dayOfMonth: Number(day),
  };
}

exports.trackChartmindSessionCompletion = functions.firestore
  .document("chartmind/{sessionId}")
  .onWrite(async (change) => {
    if (!change.after.exists) {
      return null;
    }

    const afterData = change.after.data() || {};
    const afterStep = afterData.data?.navigation?.currentStep;
    const organizationId =
      typeof afterData.organizationId === "string"
        ? afterData.organizationId.trim()
        : "";

    if (afterStep !== CHARTMIND_COMPLETED_STEP || !organizationId) {
      return null;
    }

    const sessionRef = change.after.ref;

    return db.runTransaction(async (transaction) => {
      const currentSessionSnap = await transaction.get(sessionRef);

      if (!currentSessionSnap.exists) {
        return null;
      }

      const currentSession = currentSessionSnap.data() || {};
      const currentOrgId =
        typeof currentSession.organizationId === "string"
          ? currentSession.organizationId.trim()
          : "";
      const currentStep = currentSession.data?.navigation?.currentStep;

      if (
        currentStep !== CHARTMIND_COMPLETED_STEP ||
        !currentOrgId ||
        currentSession.completionTracked === true
      ) {
        return null;
      }

      const completedAt =
        typeof currentSession.completedAt?.toDate === "function"
          ? currentSession.completedAt
          : admin.firestore.Timestamp.now();
      const { dateKey, yearMonth, dayOfMonth } = getDateKey(completedAt);

      const aggregateRef = db
        .collection("organizations")
        .doc(currentOrgId)
        .collection("chartmind_usage_daily")
        .doc(dateKey);
      const aggregateSnap = await transaction.get(aggregateRef);

      if (!aggregateSnap.exists) {
        transaction.set(aggregateRef, {
          organizationId: currentOrgId,
          dateKey,
          yearMonth,
          day: dayOfMonth,
          completedSessionsCount: 1,
          simulatedSessionsCount: currentSession.isSimulation ? 1 : 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastCompletedAt: completedAt,
        });
      } else {
        transaction.update(aggregateRef, {
          completedSessionsCount: admin.firestore.FieldValue.increment(1),
          simulatedSessionsCount: admin.firestore.FieldValue.increment(
            currentSession.isSimulation ? 1 : 0,
          ),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastCompletedAt: completedAt,
        });
      }

      transaction.set(
        sessionRef,
        {
          completionTracked: true,
          completionDateKey: dateKey,
          completedAt,
        },
        { merge: true },
      );

      return null;
    });
  });
