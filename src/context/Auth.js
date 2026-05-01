import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import firebaseApp, { db } from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { medicationService } from "../services/medicationService";
import { adherenceService } from "../services/adherenceService";
import { isChartmindAdminRole } from "constants/roles";

export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState();
  // NOTE: "subscription" is misleadingly named - it's actually the user's ROLE (patient, facility, etc.)
  // This is for backwards compatibility. The actual Stripe subscription data is in "subscriptionData"
  const [subscription, setSubscription] = useState();
  // The actual Stripe subscription object with status, created date, etc.
  const [subscriptionData, setSubscriptionData] = useState();
  const [dailyPass, setDailyPass] = useState();
  const [userData, setUserData] = useState();
  const [tokenClaims, setTokenClaims] = useState({});
  const [listings, setListings] = useState({});
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  // Organization data for admin users
  const [organization, setOrganization] = useState(null);
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [organizationInvitations, setOrganizationInvitations] = useState([]);
  // null = not initialized, true = loading, false = loaded
  const [organizationLoading, setOrganizationLoading] = useState(null);
  // Medications cache
  const [medications, setMedications] = useState([]);
  const [reminderStatuses, setReminderStatuses] = useState(new Map());
  const [medicationsLoading, setMedicationsLoading] = useState(false);

  // ============================================
  // 🚨 TEMPORARY FAKE DATA FOR PRESENTATION 🚨
  // ============================================
  // TODO: REMOVE THIS BEFORE PRODUCTION
  const USE_FAKE_TRACKING_DATA = false; // Set to false to disable fake tracking data

  // Generate realistic fake tracking data that varies each reload
  const generateRealisticTrackingData = (
    medicationId,
    medicationName,
    reminderTimes,
    daysBack = 42,
  ) => {
    const dailyData = [];
    const today = new Date();

    // Create different realistic patterns based on medication hash for consistency per med
    const medHash = medicationId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Seed random patterns based on med ID + current day so it changes on reload
    const seed = Math.abs(medHash) + new Date().getDate();
    let pseudoRandom = seed;
    const random = () => {
      pseudoRandom = (pseudoRandom * 9301 + 49297) % 233280;
      return pseudoRandom / 233280;
    };

    // Realistic adherence patterns - people are inconsistent!
    const baseAdherence = 0.7 + random() * 0.25; // Between 70-95%
    const expectedReminders = reminderTimes?.length || 1;

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      // Weekend effect - people are less consistent on weekends
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      let dayAdherence = baseAdherence;

      if (isWeekend) {
        dayAdherence *= 0.8; // 20% worse on weekends
      }

      // Add some life chaos - random bad/good periods
      if (i > 15 && i < 20 && random() > 0.4) {
        // Bad week - maybe sick or stressed
        dayAdherence *= 0.5;
      } else if (i > 25 && i < 30 && random() > 0.3) {
        // Good streak - motivated period
        dayAdherence = Math.min(1, dayAdherence * 1.3);
      }

      // Some days people completely forget/don't engage (but still show 0 data)
      if (random() < 0.05) {
        dayAdherence = 0; // Complete miss day
      }

      // Daily variation - people aren't robots
      dayAdherence += (random() - 0.5) * 0.3;
      dayAdherence = Math.max(0, Math.min(1, dayAdherence));

      // Calculate realistic taken/missed based on expected reminders
      const maxPossibleTaken = expectedReminders;
      let takenCount = 0;

      // For each expected reminder, roll the dice
      for (let reminder = 0; reminder < maxPossibleTaken; reminder++) {
        if (random() < dayAdherence) {
          takenCount++;
        }
      }

      // Sometimes people take extra or catch up (but not often)
      if (takenCount === maxPossibleTaken && random() > 0.95) {
        // Rare case: took an extra one
        takenCount = maxPossibleTaken;
      }

      const missedCount = maxPossibleTaken - takenCount;

      // ALWAYS generate entries for every day (even if 0 taken)
      const entries = [];

      // Add taken entries
      for (let j = 0; j < takenCount; j++) {
        const hourOffset =
          j * (24 / Math.max(1, expectedReminders)) + random() * 2 - 1; // Spread throughout day with some variation
        entries.push({
          id: `fake_entry_${dateString}_taken_${j}`,
          status: "taken",
          timestamp: new Date(date.getTime() + hourOffset * 60 * 60 * 1000),
          medicationId: medicationId,
        });
      }

      // Add missed entries - be more aggressive about logging misses for presentation
      for (let j = 0; j < missedCount; j++) {
        // Log more missed doses for better presentation data (50% instead of 30%)
        if (random() > 0.5 || takenCount === 0) {
          // Always log if nothing was taken that day
          const hourOffset =
            (takenCount + j) * (24 / Math.max(1, expectedReminders)) +
            random() * 2;
          entries.push({
            id: `fake_entry_${dateString}_missed_${j}`,
            status: "missed",
            timestamp: new Date(date.getTime() + hourOffset * 60 * 60 * 1000),
            medicationId: medicationId,
          });
        }
      }

      // ALWAYS add an entry for every day, even if no explicit entries
      if (entries.length === 0) {
        // If no entries were generated, create a "missed" entry to show 0/X pattern
        entries.push({
          id: `fake_entry_${dateString}_missed_0`,
          status: "missed",
          timestamp: new Date(date.getTime() + 8 * 60 * 60 * 1000), // 8 AM
          medicationId: medicationId,
        });
      }

      dailyData.push({
        date: dateString,
        adherenceRate: maxPossibleTaken > 0 ? takenCount / maxPossibleTaken : 0,
        entries: entries,
        expectedReminders: maxPossibleTaken,
        isRealTrackingDay: true,
      });
    }

    return dailyData;
  };

  // Generate fake tracking data for actual medications
  const generateFakeTrackingDataForRealMeds = (realMedications) => {
    const calendarDataByMedication = new Map();

    // Only generate tracking data for medications with adherence enabled
    const activeMeds = realMedications.filter((med) => med.adherence?.enabled);

    if (activeMeds.length === 0) {
      return {
        dashboardSummary: null,
        calendarDataByMedication,
        loaded: true,
        loading: false,
      };
    }

    activeMeds.forEach((med) => {
      const reminderTimes = med.adherence?.times || ["08:00"];
      const dailyData = generateRealisticTrackingData(
        med.id,
        med.name,
        reminderTimes,
      );
      const last7Days = dailyData.slice(-7); // Get last 7 days

      calendarDataByMedication.set(med.id, {
        dailyData: dailyData,
        isEmpty: dailyData.length === 0,
        medicationName: med.name,
        last7Days: last7Days,
      });
    });

    // Generate dashboard summary using real meds with fake tracking data
    const dashboardSummary = processDashboardSummary(
      calendarDataByMedication,
      activeMeds,
    );

    return {
      dashboardSummary,
      calendarDataByMedication,
      loaded: true,
      loading: false,
    };
  };

  // Tracking data cache - SIMPLE APPROACH for launch
  // 6 weeks: Fast loading, good for charts, covers most user patterns
  // When we scale to thousands of users, we can optimize further
  const [trackingData, setTrackingData] = useState({
    dashboardSummary: null,
    calendarDataByMedication: new Map(),
    loaded: false,
    loading: false,
  });
  const unsubRef = useRef();
  const dailyPassUnsubRef = useRef();
  const subscriptionUnsubRef = useRef();
  const listingsUnsubRef = useRef();
  const invoicesUnsubRef = useRef();
  const organizationUnsubRef = useRef();
  const medicationUnsubRef = useRef();
  const reminderUnsubRef = useRef();
  const trackingUnsubRef = useRef();

  const getData = (uid) => {
    return db
      .collection("users")
      .doc(uid)
      .onSnapshot((user) => {
        setUserData(user.data());
      });
  };

  const checkSubscriptions = (uid) => {
    return db
      .collection("users")
      .doc(uid)
      .collection("subscriptions")
      .onSnapshot((snapshot) => {
        // Find the most recent subscription document
        const subscriptions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (subscriptions.length > 0) {
          // Sort by created date (most recent first) and take the first one
          const latestSubscription = subscriptions.sort(
            (a, b) => (b.created || 0) - (a.created || 0),
          )[0];

          setSubscriptionData(latestSubscription);
        } else {
          setSubscriptionData(null);
        }
      });
  };

  const checkListings = (uid) => {
    return db
      .collection("users")
      .doc(uid)
      .collection("listings")
      .onSnapshot((snapshot) => {
        const listingsData = {};
        snapshot.forEach((doc) => {
          const listing = doc.data();
          listingsData[doc.id] = {
            id: doc.id,
            type: listing.type,
            status: listing.status || "pending",
            active: listing.active || false,
            createdAt: listing.createdAt,
            expirationDate: listing.expirationDate,
            zipCode: doc.id,
            // Fields from original zipSubscriptions (featured listings)
            isWinner: listing.type === "featured" ? true : undefined,
            isPaid:
              listing.type === "featured"
                ? listing.status === "active"
                : undefined,
            endDate: listing.endDate,
            winningBid: listing.winningBid,
            // Include any other fields that might exist
            amount_paid: listing.amount_paid,
          };
        });
        setListings(listingsData);
      });
  };

  const checkInvoices = (uid) => {
    return db
      .collection("users")
      .doc(uid)
      .collection("invoices")
      .where("status", "in", ["open", "pending"])
      .onSnapshot((snapshot) => {
        const invoicesData = snapshot.docs.map((doc) => doc.data());
        setInvoices(invoicesData);
      });
  };

  const loadOrganizationTeamData = async (orgId) => {
    if (!orgId) {
      setOrganizationMembers([]);
      setOrganizationInvitations([]);
      return;
    }

    try {
      const fn = firebaseApp
        .functions()
        .httpsCallable("getOrganizationTeamData");
      const { data } = await fn();

      // Defensive check: never hydrate team data if response org doesn't match.
      if (data?.organizationId !== orgId) {
        setOrganizationMembers([]);
        setOrganizationInvitations([]);
        return;
      }

      setOrganizationMembers(Array.isArray(data?.members) ? data.members : []);
      setOrganizationInvitations(
        Array.isArray(data?.invitations) ? data.invitations : [],
      );
    } catch (error) {
      console.error("Error loading organization team data:", error);
      setOrganizationMembers([]);
      setOrganizationInvitations([]);
    }
  };

  const refreshOrganizationTeamData = async () => {
    if (!userData?.organizationId || userData?.role !== "admin") return;
    await loadOrganizationTeamData(userData.organizationId);
  };

  // Set up organization data listeners for admin users
  const setupOrganizationSnapshots = (userData) => {
    if (!userData?.organizationId) return;

    setOrganizationLoading(true);

    const orgId = userData.organizationId;

    // Listen for organization doc
    organizationUnsubRef.current = db
      .collection("organizations")
      .doc(orgId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setOrganization({
              id: doc.id,
              ...doc.data(),
            });
          } else {
            console.error("Organization document not found:", orgId);
            setOrganization(null);
          }
        },
        (error) => {
          console.error("Error in organization snapshot:", error);
          setOrganization(null);
        },
      );

    loadOrganizationTeamData(orgId).finally(() => {
      setOrganizationLoading(false);
    });
  };

  // Load medications and reminder statuses with real-time snapshots
  const setupMedicationSnapshots = (uid) => {
    if (!uid) return;

    setMedicationsLoading(true);

    // Set up medication snapshot listener
    medicationUnsubRef.current = db
      .collection("users")
      .doc(uid)
      .collection("medications")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const meds = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamps to JS Dates
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          }));
          setMedications(meds);
          setMedicationsLoading(false);
        },
        (error) => {
          console.error("Error in medication snapshot:", error);
          setMedications([]);
          setMedicationsLoading(false);
        },
      );

    // Set up reminder status snapshot listener
    reminderUnsubRef.current = db
      .collection("users")
      .doc(uid)
      .collection("medicationReminders")
      .onSnapshot(
        (snapshot) => {
          const reminderMap = new Map();
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            reminderMap.set(data.medicationId, {
              enabled: data.enabled,
              times: data.times || [],
              timezone: data.timezone,
            });
          });
          setReminderStatuses(reminderMap);
        },
        (error) => {
          console.error("Error in reminder snapshot:", error);
          setReminderStatuses(new Map());
        },
      );
  };

  // Legacy function for backwards compatibility - now just calls setupMedicationSnapshots
  const loadMedications = (uid) => {
    return setupMedicationSnapshots(uid);
  };

  // Set up smart tracking data snapshot listener
  const setupTrackingDataSnapshot = (uid) => {
    if (!uid) return;

    // Calculate date range for recent tracking data (6 weeks)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 42);

    // Format dates as YYYY-MM-DD for document IDs
    const startDateId = startDate.toISOString().slice(0, 10);
    const endDateId = endDate.toISOString().slice(0, 10);

    // Set up snapshot listener for recent tracking data
    trackingUnsubRef.current = db
      .collection("users")
      .doc(uid)
      .collection("medicationTracking")
      .where(firebase.firestore.FieldPath.documentId(), ">=", startDateId)
      .where(firebase.firestore.FieldPath.documentId(), "<=", endDateId)
      .onSnapshot(
        (snapshot) => {
          // Only trigger reload if we already have data loaded and this is a real change
          if (trackingData.loaded && !snapshot.metadata.fromCache) {
            // Invalidate and reload tracking data
            setTrackingData((prev) => ({ ...prev, loaded: false }));
            // The existing loadTrackingData will be triggered by the useEffect
          }
        },
        (error) => {
          console.error("Error in tracking data snapshot:", error);
        },
      );
  };

  // Medication CRUD operations
  const addMedication = async (medicationData) => {
    if (!user?.uid) throw new Error("User not authenticated");

    try {
      const newMedication = await medicationService.createMedication(
        user.uid,
        medicationData,
      );
      setMedications((prev) => [newMedication, ...prev]);

      // Invalidate tracking data cache so new medication gets included
      setTrackingData((prev) => ({ ...prev, loaded: false }));

      return newMedication;
    } catch (error) {
      console.error("Error adding medication:", error);
      throw error;
    }
  };

  const updateMedication = async (medicationId, medicationData) => {
    if (!user?.uid) throw new Error("User not authenticated");

    try {
      await medicationService.updateMedication(
        user.uid,
        medicationId,
        medicationData,
      );
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medicationId ? { ...med, ...medicationData } : med,
        ),
      );

      // Invalidate tracking data cache so changes get reflected
      setTrackingData((prev) => ({ ...prev, loaded: false }));
    } catch (error) {
      console.error("Error updating medication:", error);
      throw error;
    }
  };

  const deleteMedication = async (medicationId) => {
    if (!user?.uid) throw new Error("User not authenticated");

    try {
      await medicationService.deleteMedication(user.uid, medicationId);
      setMedications((prev) => prev.filter((med) => med.id !== medicationId));
      // Also remove from reminder statuses
      setReminderStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.delete(medicationId);
        return newMap;
      });

      // Invalidate tracking data cache so deleted medication gets removed
      setTrackingData((prev) => ({ ...prev, loaded: false }));
    } catch (error) {
      console.error("Error deleting medication:", error);
      throw error;
    }
  };

  // Refresh reminder statuses after adherence changes
  const refreshReminderStatuses = async () => {
    if (!user?.uid) return;

    try {
      const reminders = await adherenceService.getUserReminders(user.uid);
      const reminderMap = new Map();
      reminders.forEach((reminder) => {
        reminderMap.set(reminder.medicationId, {
          enabled: reminder.enabled,
          times: reminder.times || ["08:00"],
          timezone: reminder.timezone,
        });
      });
      setReminderStatuses(reminderMap);
    } catch (error) {
      console.error("Error refreshing reminder statuses:", error);
    }
  };

  // Helper function to get last 7 days
  const getLast7Days = (dailyData) => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      // Find data for this date
      const dayData = dailyData.find((d) => d.date === dateString);
      if (dayData) {
        days.push(dayData);
      }
    }

    return days;
  };

  // Load tracking data - LAUNCH COMPROMISE: 6 weeks for performance + accuracy balance
  // Fast for new users, accurate for recent trends, simple architecture
  const loadTrackingData = useCallback(
    async (daysToLoad = 42) => {
      if (!user?.uid || trackingData.loading || trackingData.loaded) {
        return;
      }

      // 🚨 TEMPORARY: Use fake tracking data for presentation
      if (USE_FAKE_TRACKING_DATA) {
        const fakeTrackingData =
          generateFakeTrackingDataForRealMeds(medications);
        setTrackingData(fakeTrackingData);
        return;
      }
      // END TEMPORARY FAKE DATA

      // Process ALL medications, not just those with alerts enabled
      // The filtering should happen at display time, not data loading time
      const allMeds = medications;

      if (allMeds.length === 0) {
        setTrackingData((prev) => ({ ...prev, loaded: true }));
        return;
      }

      try {
        setTrackingData((prev) => ({ ...prev, loading: true }));

        // Get tracking data for all medications
        const calendarDataByMedication = new Map();

        await Promise.all(
          allMeds.map(async (med, index) => {
            try {
              const dailyData = await adherenceService.getDailyTrackingData(
                med.id,
                daysToLoad,
              );

              // Get last 7 days for compact view
              const last7Days = getLast7Days(dailyData || []);

              calendarDataByMedication.set(med.id, {
                dailyData: dailyData || [],
                isEmpty: !dailyData || dailyData.length === 0,
                medicationName: med.name,
                last7Days,
              });
            } catch (error) {
              console.error(
                `Error loading tracking data for ${med.name}:`,
                error,
              );
              calendarDataByMedication.set(med.id, {
                dailyData: [],
                isEmpty: true,
                medicationName: med.name,
                last7Days: [],
              });
            }
          }),
        );

        // Process dashboard summary
        const dashboardSummary = processDashboardSummary(
          calendarDataByMedication,
          allMeds,
        );

        setTrackingData({
          dashboardSummary,
          calendarDataByMedication,
          loaded: true,
          loading: false,
        });
      } catch (error) {
        console.error("Error loading tracking data:", error);
        setTrackingData((prev) => ({
          ...prev,
          loading: false,
          loaded: true, // Prevent infinite retry
        }));
      }
    },
    [
      user?.uid,
      trackingData.loading,
      trackingData.loaded,
      medications, // Use full array to avoid stale closure issues
    ],
  );

  // REMOVED complex lifetime stats loading - keeping it simple for launch
  // When we have thousands of users, we can add back sophisticated optimization

  // Process dashboard summary - moved from hook to context
  const processDashboardSummary = (calendarDataByMedication, medications) => {
    // For dashboard summary, we only calculate stats for medications with alerts enabled
    const activeMeds = medications.filter((med) => med.adherence?.enabled);

    let totalPerfectDays = 0;
    let totalGoodDays = 0;
    let totalPartialDays = 0;
    let totalPoorDays = 0;
    let totalMissedDays = 0;
    let totalResponsesGiven = 0;
    let totalMedicationsTaken = 0; // FIXED: Count actual medications taken, not days
    let adherenceScores = [];
    let allStreaks = [];

    calendarDataByMedication.forEach((calendarData, medId) => {
      if (calendarData.isEmpty || !calendarData.dailyData) {
        return;
      }

      let perfectDays = 0;
      let goodDays = 0;
      let partialDays = 0;
      let poorDays = 0;
      let missedDays = 0;
      let responsesGiven = 0;

      calendarData.dailyData.forEach((day) => {
        const adherenceRate = day.adherenceRate || 0;
        const takenEntries =
          day.entries?.filter((e) => e.status === "taken").length || 0;
        responsesGiven += takenEntries;

        // FIXED: Count actual medications taken for this medication
        if (day.isRealTrackingDay && day.expectedReminders > 0) {
          totalMedicationsTaken += takenEntries;
        }

        if (day.entries && day.entries.length > 0) {
          if (adherenceRate >= 1.0) {
            perfectDays++;
          } else if (adherenceRate >= 0.8) {
            goodDays++;
          } else if (adherenceRate >= 0.5) {
            partialDays++;
          } else if (adherenceRate > 0) {
            poorDays++;
          } else {
            missedDays++;
          }
        }
      });

      // Calculate adherence score
      let adherenceScore = 0;
      let totalDosesTaken = 0;
      let totalDosesExpected = 0;

      calendarData.dailyData.forEach((day) => {
        // FIXED: Only count real tracking days, not heatmap filler days
        if (day.isRealTrackingDay && day.expectedReminders > 0) {
          const expectedCount = day.expectedReminders;
          const takenCount = day.entries
            ? day.entries.filter((e) => e.status === "taken").length
            : 0;

          totalDosesTaken += takenCount;
          totalDosesExpected += expectedCount;
        }
      });

      if (totalDosesExpected > 0) {
        adherenceScore = Math.round(
          (totalDosesTaken / totalDosesExpected) * 100,
        );
      }

      // Calculate streaks - both current and all historical consecutive streaks
      const daysWithData = calendarData.dailyData
        .filter((day) => day.isRealTrackingDay && day.expectedReminders > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically for streak analysis

      // Calculate current streak (from most recent day backwards)
      let currentStreak = 0;
      const reverseDays = [...daysWithData].reverse();
      for (const day of reverseDays) {
        if (day.adherenceRate >= 1.0) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate ALL consecutive streaks throughout history
      const allConsecutiveStreaks = [];
      let currentConsecutiveStreak = 0;

      for (const day of daysWithData) {
        if (day.adherenceRate >= 1.0) {
          currentConsecutiveStreak++;
        } else {
          if (currentConsecutiveStreak > 0) {
            allConsecutiveStreaks.push(currentConsecutiveStreak);
            currentConsecutiveStreak = 0;
          }
        }
      }
      // Don't forget the last streak if the data ends on a perfect day
      if (currentConsecutiveStreak > 0) {
        allConsecutiveStreaks.push(currentConsecutiveStreak);
      }

      // Add to totals
      totalPerfectDays += perfectDays;
      totalGoodDays += goodDays;
      totalPartialDays += partialDays;
      totalPoorDays += poorDays;
      totalMissedDays += missedDays;
      totalResponsesGiven += responsesGiven;

      if (adherenceScore > 0) {
        adherenceScores.push(adherenceScore);
      }

      // Store both current streak and all historical streaks
      allStreaks.push({
        currentStreak,
        allConsecutiveStreaks,
        medicationId: medId,
      });
    });

    // FIXED: Use total dose calculation (33%) instead of average percentages (25%)
    // Calculate overall adherence as total taken / total expected across ALL medications
    let grandTotalTaken = 0;
    let grandTotalExpected = 0;

    calendarDataByMedication.forEach((calendarData, medId) => {
      if (calendarData.isEmpty || !calendarData.dailyData) return;

      calendarData.dailyData.forEach((day) => {
        // FIXED: Only count real tracking days for overall calculation
        if (day.isRealTrackingDay && day.expectedReminders > 0) {
          const expectedCount = day.expectedReminders;
          const takenCount = day.entries
            ? day.entries.filter((e) => e.status === "taken").length
            : 0;

          grandTotalTaken += takenCount;
          grandTotalExpected += expectedCount;
        }
      });
    });

    const averageAdherence =
      grandTotalExpected > 0
        ? Math.round((grandTotalTaken / grandTotalExpected) * 100)
        : 0;

    // Filter streaks for medications that have actual tracking data
    const activeStreakData = allStreaks.filter((streakData) => {
      const medData = calendarDataByMedication.get(streakData.medicationId);
      const hasTrackingData =
        medData &&
        !medData.isEmpty &&
        medData.dailyData.some((day) => day.entries && day.entries.length > 0);
      return hasTrackingData;
    });

    // Current streak is the minimum across all active medications (all meds must be consistent)
    const currentStreaks = activeStreakData.map((data) => data.currentStreak);
    const currentStreak =
      currentStreaks.length > 0 ? Math.min(...currentStreaks) : 0;

    // Best streak is the maximum of ALL consecutive streaks throughout history across all medications
    const allHistoricalStreaks = allStreaks.flatMap(
      (data) => data.allConsecutiveStreaks,
    );
    const bestStreak =
      allHistoricalStreaks.length > 0 ? Math.max(...allHistoricalStreaks) : 0;

    // Generate encouragement message
    let message = "";
    if (totalResponsesGiven > 0) {
      const firstDoseDate = Array.from(calendarDataByMedication.values())
        .flatMap((data) => data.dailyData || [])
        .filter((day) => day.adherenceRate > 0)
        .map((day) => new Date(day.date))
        .sort((a, b) => a - b)[0];

      const daysSinceStart = firstDoseDate
        ? Math.ceil((new Date() - firstDoseDate) / (1000 * 60 * 60 * 24))
        : 1;

      if (averageAdherence >= 90) {
        message =
          daysSinceStart >= 30
            ? "Outstanding! Your consistent routine over the past month is paying off."
            : daysSinceStart >= 14
              ? "Excellent work! You're building an amazing medication habit."
              : "Fantastic start! You're already crushing your medication routine.";
      } else if (averageAdherence >= 75) {
        message =
          daysSinceStart >= 21
            ? "Solid work! You've built a strong habit."
            : "Great job! You're staying consistent with your medications.";
      } else if (averageAdherence >= 50) {
        message =
          bestStreak >= 5
            ? "You've had some great streaks! Let's get back to that consistent rhythm."
            : "You're making progress! Consider adding more reminder times or adjusting the schedule to improve.";
      } else {
        message =
          daysSinceStart <= 3
            ? "Every start is a victory! Building a medication routine takes time - you've got this."
            : bestStreak > 0
              ? "You can do this! Let's get back to that streak you had going."
              : "Starting is the hardest part, and you've already begun! Try setting more frequent reminders to build the habit.";
      }
    }

    return {
      averageAdherence,
      totalTaken: totalMedicationsTaken, // TODO(SCALE): When users have 6+ months of data, consider loading full history for lifetime accuracy
      totalMissed: totalPartialDays + totalPoorDays + totalMissedDays,
      bestStreak, // TODO(SCALE): May not reflect true lifetime best if user has data beyond 6-week window
      currentStreak,
      badges: [],
      message,
      totalMedications: activeMeds.length,
    };
  };

  // Clear tracking data when needed
  const clearTrackingData = useCallback(() => {
    setTrackingData({
      dashboardSummary: null,
      calendarDataByMedication: new Map(),
      loaded: false,
      loading: false,
    });
  }, []);

  // Force reset tracking data
  const forceResetTrackingData = () => {
    setTrackingData({
      dashboardSummary: null,
      calendarDataByMedication: new Map(),
      loaded: false,
      loading: false,
    });
  };

  // Sync pending email verification when user logs in
  // This handles the case where email was verified but Firestore update failed
  useEffect(() => {
    const syncPendingEmail = async () => {
      if (!user || !userData) return;

      // Check if there's a pending email that matches Firebase Auth email
      if (
        userData.pendingEmail &&
        user.email &&
        userData.pendingEmail === user.email
      ) {
        console.log("Syncing pending email to Firestore:", user.email);
        try {
          await db.collection("users").doc(user.uid).update({
            email: user.email,
            pendingEmail: firebase.firestore.FieldValue.delete(),
            emailChangeRequested: firebase.firestore.FieldValue.delete(),
          });
          console.log("Successfully synced email to Firestore");
        } catch (err) {
          console.error("Failed to sync email:", err);
        }
      }
    };

    syncPendingEmail();
  }, [user, userData]);

  useEffect(() => {
    let authListener = firebaseApp.auth().onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        await firebaseApp.auth().currentUser?.getIdToken(true);
        const decodedToken = await firebaseApp
          .auth()
          .currentUser?.getIdTokenResult();

        setTokenClaims(decodedToken?.claims || {});

        let role = decodedToken?.claims?.stripeRole;
        if (decodedToken?.claims?.admin) {
          role = "global_admin";
        }
        setSubscription(role); // This is the ROLE, not subscription data!
        unsubRef.current = getData(user.uid);
        subscriptionUnsubRef.current = checkSubscriptions(user.uid);
        listingsUnsubRef.current = checkListings(user.uid);
        invoicesUnsubRef.current = checkInvoices(user.uid);
        // Set up medication and reminder snapshot listeners (only for patients)
        if ((role === "patient" || role === "p4") && !decodedToken?.claims?.admin) {
          setupMedicationSnapshots(user.uid);
          setupTrackingDataSnapshot(user.uid);
        }
        // Organization snapshots for admins are set up in a separate useEffect
        // that watches userData.role (since admin role may not be in token claims)
      } else {
        setSubscription(null);
        setSubscriptionData(null);
        setUserData(null);
        setTokenClaims({});
        setDailyPass(null);
        setListings({});
        setInvoices([]);
        // Clear organization data
        setOrganizationMembers([]);
        setOrganizationInvitations([]);
        setOrganizationLoading(null);
        // Clear medication cache
        setMedications([]);
        setReminderStatuses(new Map());
        setMedicationsLoading(false);
        // Clear tracking data cache
        clearTrackingData();
        // Clean up organization snapshots
        if (organizationUnsubRef.current) {
          organizationUnsubRef.current();
          organizationUnsubRef.current = null;
        }
        // Clean up medication and reminder snapshots
        if (medicationUnsubRef.current) {
          medicationUnsubRef.current();
          medicationUnsubRef.current = null;
        }
        if (reminderUnsubRef.current) {
          reminderUnsubRef.current();
          reminderUnsubRef.current = null;
        }
        if (trackingUnsubRef.current) {
          trackingUnsubRef.current();
          trackingUnsubRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      authListener();
      if (unsubRef.current) unsubRef.current();
      if (dailyPassUnsubRef.current) dailyPassUnsubRef.current();
      if (subscriptionUnsubRef.current) subscriptionUnsubRef.current();
      if (listingsUnsubRef.current) listingsUnsubRef.current();
      if (invoicesUnsubRef.current) invoicesUnsubRef.current();
      if (organizationUnsubRef.current) organizationUnsubRef.current();
      if (medicationUnsubRef.current) medicationUnsubRef.current();
      if (reminderUnsubRef.current) reminderUnsubRef.current();
      if (trackingUnsubRef.current) trackingUnsubRef.current();
    };
  }, []);

  // Set up organization snapshots for admin users (based on userData.role, not token claims)
  useEffect(() => {
    if (!user?.uid || !userData?.role) return;

    if (userData.role === "admin" || isChartmindAdminRole(userData.role)) {
      setupOrganizationSnapshots(userData);
    }

    return () => {
      if (organizationUnsubRef.current) {
        organizationUnsubRef.current();
        organizationUnsubRef.current = null;
      }
    };
  }, [user?.uid, userData?.role, userData?.organizationId]);

  const handleLogout = async () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (dailyPassUnsubRef.current) {
      dailyPassUnsubRef.current();
      dailyPassUnsubRef.current = null;
    }
    if (subscriptionUnsubRef.current) {
      subscriptionUnsubRef.current();
      subscriptionUnsubRef.current = null;
    }
    if (listingsUnsubRef.current) {
      listingsUnsubRef.current();
      listingsUnsubRef.current = null;
    }
    if (invoicesUnsubRef.current) {
      invoicesUnsubRef.current();
      invoicesUnsubRef.current = null;
    }
    if (organizationUnsubRef.current) {
      organizationUnsubRef.current();
      organizationUnsubRef.current = null;
    }
    if (medicationUnsubRef.current) {
      medicationUnsubRef.current();
      medicationUnsubRef.current = null;
    }
    if (reminderUnsubRef.current) {
      reminderUnsubRef.current();
      reminderUnsubRef.current = null;
    }
    if (trackingUnsubRef.current) {
      trackingUnsubRef.current();
      trackingUnsubRef.current = null;
    }

    // Clear organization data
    setOrganizationMembers([]);
    setOrganizationInvitations([]);
    setOrganizationLoading(null);
    // Clear medication cache
    setMedications([]);
    setReminderStatuses(new Map());
    setMedicationsLoading(false);
    // Clear tracking data cache
    clearTrackingData();

    await firebase.auth().signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription, // This is the user ROLE (patient, facility, etc.) - confusing naming for backwards compatibility
        subscriptionData, // This is the actual Stripe subscription object with status
        tokenClaims,
        // Platform super-admin: JWT custom claim only (not Firestore role).
        isGlobalAdmin: Boolean(tokenClaims?.admin),

        userData,
        listings,
        invoices,
        userLoading: loading,
        logout: handleLogout,

        // Medication management
        medications,
        reminderStatuses,
        medicationsLoading,
        addMedication,
        updateMedication,
        deleteMedication,
        refreshReminderStatuses,
        loadMedications,

        // Tracking data management
        trackingData,
        loadTrackingData,
        clearTrackingData,
        forceResetTrackingData, // DEBUG function

        // Organization data (for admin users)
        organization,
        organizationMembers,
        organizationInvitations,
        organizationLoading,
        refreshOrganizationTeamData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
