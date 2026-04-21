import { differenceInHours, isToday, format } from "date-fns";

export const calculateWaitingScore = (score) => {
  if (score === undefined) {
    return undefined;
  }

  if (score <= 1) return 30;
  else if (score <= 2) return 60;
  else if (score <= 3) return 120;
  else if (score <= 5) return 150;
  else if (score <= 7) return 180;
  else if (score <= 9) return 240;
  else return 360;
};

/**
 * Calculate My HealthDesk score based on facility capabilities and settings
 * The score consists of four components, each worth up to 25 points (total 100):
 *
 * 1. Rating Component (0-25 points)
 *    - Based on the facility's star rating (0-5 stars)
 *    - Linear scaling: (rating/5) * 25
 *
 * 2. Capabilities Component (0-25 points)
 *    - Based on enabled medical capabilities (lab, xray, ultrasound, ct, mri)
 *    - Each capability contributes equally to the total
 *    - Formula: (enabled_capabilities / total_capabilities) * 25
 *
 * 3. Queue Component (0 or 25 points)
 *    - Binary score based on whether virtual queue is enabled
 *    - 25 points if enabled, 0 if disabled
 *
 * 4. Waiting Time Component (0-25 points)
 *    - Based on predefined wait time steps: [30, 60, 120, 150, 180, 240, 360]
 *    - Score is calculated based on step position (1-7)
 *    - Lower step = higher score (30min = 25 points, 360min = 0 points)
 *    - Time decay multiplier:
 *      * 0-4 hours: 1.0x (full points)
 *      * 4-12 hours: 0.7x
 *      * 12-24 hours: 0.4x
 *      * 24+ hours: 0.1x
 *
 * @param {Object} locationData - The location document data
 * @param {boolean} [overrideQueueEnabled] - Optional override for the queueEnabled value
 * @returns {Object} The hlthdsk_score object with components and total
 */
export const calculateHlthdskScore = (locationData, overrideQueueEnabled) => {
  // Rating component (0-25 points)
  const ratingComponent = locationData.rating
    ? Math.round((locationData.rating / 5) * 25)
    : 0;

  // Capabilities component (0-25 points)
  let capabilitiesComponent = 0;
  const capabilityFields = ["lab", "xray", "ultrasound", "ct", "mri"];

  // Check if capabilities field exists and calculate points
  if (locationData.capabilities) {
    const enabledCapabilities = capabilityFields.filter(
      (capability) => locationData.capabilities[capability] === true
    );

    // Calculate points based on how many capabilities are enabled
    if (enabledCapabilities.length > 0) {
      capabilitiesComponent = Math.round(
        (enabledCapabilities.length / capabilityFields.length) * 25
      );
    }
  }

  // Queue component (0 or 25 points)
  const queueEnabled =
    overrideQueueEnabled !== undefined
      ? overrideQueueEnabled
      : locationData.queueEnabled === true;
  const queueComponent = queueEnabled ? 25 : 0;

  // Waiting time component (0-25 points)
  let waitingTimeComponent = 0;
  if (locationData.waitTimes?.length > 0) {
    const now = Date.now();

    // Get all admin wait times, sorted by date
    const adminTimes = [...locationData.waitTimes]
      .filter((time) => time.admin && time.waitTime)
      .sort((a, b) => b.date - a.date);

    if (adminTimes.length > 0) {
      // Find the most recent past time
      const pastTimes = adminTimes.filter((time) => time.date <= now);
      const mostRecentPast = pastTimes[0];

      if (mostRecentPast) {
        const hoursSinceUpdate = differenceInHours(now, mostRecentPast.date);

        // Calculate time decay multiplier
        let timeDecayMultiplier = 0.1; // Default for 24+ hours
        if (hoursSinceUpdate <= 4) timeDecayMultiplier = 1.0;
        else if (hoursSinceUpdate <= 12) timeDecayMultiplier = 0.7;
        else if (hoursSinceUpdate <= 24) timeDecayMultiplier = 0.4;

        // Predefined wait time steps
        const waitTimeSteps = [30, 60, 120, 150, 180, 240, 360];
        const waitTime = parseInt(mostRecentPast.waitTime);

        // Find which step the wait time is on
        const stepIndex = waitTimeSteps.findIndex((step) => waitTime <= step);
        const stepPosition =
          stepIndex === -1 ? waitTimeSteps.length : stepIndex + 1;

        // Calculate score based on step position (1-7)
        // First step (30min) = 25 points, last step (360min) = 0 points
        const waitTimeScore = Math.max(
          0,
          25 * (1 - (stepPosition - 1) / (waitTimeSteps.length - 1))
        );

        // Apply time decay
        waitingTimeComponent = Math.round(waitTimeScore * timeDecayMultiplier);
      }
    }
  }

  // Calculate total score (capped at 100)
  const totalScore = Math.min(
    100,
    ratingComponent +
      capabilitiesComponent +
      queueComponent +
      waitingTimeComponent
  );

  return {
    rating_component: ratingComponent,
    capabilities_component: capabilitiesComponent,
    queue_component: queueComponent,
    waiting_time_component: waitingTimeComponent,
    total: Math.round(totalScore),
  };
};

/**
 * Gets the most recent admin wait time
 * @param {Array} times - Array of wait time entries
 * @returns {number|undefined} Wait time in minutes or undefined
 */
export const getAdminTime = (times) => {
  // Sort by date (newest first) and find the first entry with waitTime
  const sortedTimes = [...times].sort((a, b) => b.date - a.date);
  const latestTime = sortedTimes.find((time) => time.waitTime);

  if (latestTime?.temp && differenceInHours(Date.now(), latestTime.date)) {
    return undefined;
  }
  return latestTime?.waitTime;
};

/**
 * Calculates average wait time from user-submitted wait time entries
 * Note: This is deprecated and should be avoided in favor of admin times
 * @param {Array} times - Array of wait time entries
 * @returns {number} Average wait time in minutes
 */
export const getUserTime = (times) =>
  times.reduce((sum, time) => sum + Number(time.waitTime), 0) / times.length;

/**
 * Gets the currently active wait time for display in a unified way across the app
 * This is the SINGLE source of truth for the currently displayed wait time
 *
 * @param {Object} data - The location data containing waitTimes array
 * @param {boolean} needsUpdate - Whether the time needs updating (for UI indication)
 * @returns {Object|null} Object with wait time info or null if no valid time
 */
export const getActiveWaitTime = (data, needsUpdate = false) => {
  if (!data?.waitTimes?.length) return null;

  const now = new Date();
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  // First look for manual (non-scheduled) entries as they take precedence
  const manualEntries = data.waitTimes
    .filter(
      (entry) => !entry.scheduled && entry.admin && new Date(entry.date) <= now
    ) // Filter out future entries
    .sort((a, b) => b.date - a.date); // newest first

  if (manualEntries.length > 0) {
    const latestManual = manualEntries[0];

    return {
      isManual: true,
      isUserSubmitted: false,
      date: new Date(latestManual.date),
      waitTime: latestManual.waitTime,
      timeDisplay: format(new Date(latestManual.date), "h:mm a"),
      needsUpdate,
    };
  }

  // If no manual entries, find the most recent scheduled admin entry for today
  const currentHour = now.getHours();

  // Look for today's scheduled entries
  const todaysScheduled = data.waitTimes
    .filter(
      (entry) => entry.scheduled && entry.admin && isToday(new Date(entry.date))
    )
    .map((entry) => ({
      date: new Date(entry.date),
      hour: new Date(entry.date).getHours(),
      waitTime: entry.waitTime,
      original: entry,
    }))
    .sort((a, b) => a.hour - b.hour); // sort by hour ascending

  // Find most recent past entry (most recent hour that is <= current hour)
  let activeSlot = null;
  for (const slot of todaysScheduled) {
    if (slot.hour <= currentHour) {
      activeSlot = slot;
    } else {
      break; // Stop once we find a future entry
    }
  }

  if (activeSlot) {
    return {
      isManual: false,
      isUserSubmitted: false,
      date: activeSlot.date,
      waitTime: activeSlot.waitTime,
      timeDisplay: format(activeSlot.date, "h:mm a"),
      needsUpdate,
    };
  }

  // Fallback to most recent admin time if no scheduled times for today
  if (manualEntries.length === 0) {
    const adminEntries = data.waitTimes
      .filter((entry) => entry.admin && new Date(entry.date) <= now) // Filter out future entries
      .sort((a, b) => b.date - a.date); // newest first

    if (adminEntries.length > 0) {
      const latestAdmin = adminEntries[0];
      return {
        isManual: false,
        isUserSubmitted: false,
        date: new Date(latestAdmin.date),
        waitTime: latestAdmin.waitTime,
        timeDisplay: format(new Date(latestAdmin.date), "h:mm a"),
        needsUpdate,
      };
    }
  }

  // If no admin times are available or all admin times are older than 24 hours,
  // check for user-submitted times within the last 3 hours
  const recentUserEntries = data.waitTimes
    .filter(
      (entry) =>
        !entry.admin &&
        // Only use user entries from the last 3 hours and not in the future
        now.getTime() - entry.date < THREE_HOURS_MS &&
        new Date(entry.date) <= now
    )
    .sort((a, b) => b.date - a.date);

  if (recentUserEntries.length > 0) {
    // For user entries, calculate the average if there are multiple recent entries
    // This helps prevent gaming by individual users
    const recentUserWaitTime = Math.round(
      recentUserEntries.reduce(
        (sum, entry) => sum + Number(entry.waitTime),
        0
      ) / recentUserEntries.length
    );

    return {
      isManual: false,
      isUserSubmitted: true,
      date: new Date(recentUserEntries[0].date), // Use the most recent entry's date
      waitTime: recentUserWaitTime,
      timeDisplay: format(new Date(recentUserEntries[0].date), "h:mm a"),
      needsUpdate: false, // Don't show warning for user times
      userCount: recentUserEntries.length,
    };
  }

  return null;
};

/**
 * Process a list of locations, extracting and normalizing data for display
 * @param {Array} locations - Array of location documents
 * @returns {Array} Processed locations with normalized data
 */
export const processLocations = (locations) => {
  const timeLimit = 60 * 60 * 1000 * 3;

  return locations.map((location) => {
    const newLocation = { ...location };

    // Copy basic data
    newLocation.email = location.email;
    newLocation.queueEnabled = location.queueEnabled;
    newLocation.queueCap = location.queueCap;
    newLocation.queueLength = location.queue?.length;

    const waitTimes = location.waitTimes;

    if (!waitTimes) {
      newLocation.waitScore = calculateWaitingScore(location.score);
      return newLocation;
    }

    const sortedWaitTimes = [...waitTimes].reverse();

    // Extract admin flag
    const adminData = sortedWaitTimes.find((time) => time.admin);
    if (adminData) {
      newLocation.admin = adminData.admin;
    }

    // Extract customPhone from waitTimes if it doesn't exist at top level
    const dashboardData = sortedWaitTimes.find((time) => time.dashboard);
    if (
      dashboardData &&
      newLocation.customPhone === undefined &&
      dashboardData.customPhone !== undefined
    ) {
      newLocation.customPhone = dashboardData.customPhone;
    }

    // Process wait times
    const validWaitTimes = waitTimes.filter(
      (time) => new Date() - time.date < timeLimit && new Date() > time.date
    );

    if (!validWaitTimes.length) {
      newLocation.waitScore = calculateWaitingScore(location.score);
      return newLocation;
    }

    const adminWaitTimes = validWaitTimes.filter((time) => time.admin);

    // Get the active wait time based on the location data
    const activeTime = getActiveWaitTime(location);

    // Set averageWaitTime to the active wait time value for consistency
    newLocation.averageWaitTime =
      activeTime?.waitTime || getAdminTime(sortedWaitTimes);

    // User-submitted times are only used if there are no admin times
    if (!adminWaitTimes.length && !activeTime?.waitTime) {
      newLocation.averageWaitTime = getUserTime(validWaitTimes);
    }

    // Fallback to waitScore if no valid times
    if (newLocation.averageWaitTime === undefined) {
      newLocation.waitScore = calculateWaitingScore(location.score);
    }

    // Find the most recent admin time entry for lastUpdated
    const sortedAdminTimes = [...adminWaitTimes].sort(
      (a, b) => b.date - a.date
    );

    // For lastUpdated, prioritize the most recent admin entry (not just the first one)
    newLocation.lastUpdated = adminWaitTimes.length
      ? sortedAdminTimes[0].date
      : validWaitTimes[0].date;

    return newLocation;
  });
};
