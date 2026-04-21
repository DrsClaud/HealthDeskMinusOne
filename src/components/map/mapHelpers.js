/**
 * Map utility functions for handling wait times, scoring, and location data processing.
 */

import { differenceInHours } from "date-fns";
import {
  getAdminTime,
  getUserTime,
  getActiveWaitTime,
  calculateWaitingScore as calculateWaitingScoreOriginal,
} from "utils/locationProcessing";

// Re-export for backward compatibility
export const calculateWaitingScore = calculateWaitingScoreOriginal;

/**
 * Processes admin data from wait times and updates location object
 * @param {Object} location - Location object to update
 * @param {Array} waitTimes - Sorted array of wait time entries
 */
const processAdminData = (location, waitTimes) => {
  const adminData = waitTimes.find((time) => time.admin);
  if (adminData) {
    const { admin } = adminData;
    location.admin = admin;
  }
};

/**
 * Processes dashboard data and updates location object with facility information
 * @param {Object} location - Location object to update
 * @param {Array} waitTimes - Sorted array of wait time entries
 */
const processDashboardData = (location, waitTimes) => {
  // First check if we have the capabilities in the dedicated field
  if (location.capabilities) {
    // No need to do anything, capabilities are already in the main object
  }
  // Legacy support - if no capabilities field, extract from waitTimes
  else {
    const dashboardData = waitTimes.find((time) => time.dashboard);
    if (dashboardData && dashboardData.customPhone && !location.customPhone) {
      location.customPhone = dashboardData.customPhone;
    }
  }
};

export const processLocationData = (locations) => {
  const timeLimit = 60 * 60 * 1000 * 3;

  return locations.map((location) => {
    // Make sure to create a deep copy to avoid mutating the original data
    const newLocation = {
      ...location,
      // Preserve critical waitTimes - needed by getActiveWaitTime
      waitTimes: location.waitTimes ? [...location.waitTimes] : undefined,
    };

    const waitTimes = location.waitTimes;

    if (!waitTimes) {
      newLocation.waitScore = calculateWaitingScore(location.score);
      return newLocation;
    }

    const sortedWaitTimes = [...waitTimes].reverse();
    const validWaitTimes = waitTimes.filter(
      (time) => new Date() - time.date < timeLimit && new Date() > time.date
    );

    processAdminData(newLocation, sortedWaitTimes);
    processDashboardData(newLocation, sortedWaitTimes);

    if (!validWaitTimes.length) {
      newLocation.waitScore = calculateWaitingScore(location.score);
      return newLocation;
    }

    // Use the shared getActiveWaitTime function for consistency
    const activeTime = getActiveWaitTime(newLocation);

    if (activeTime) {
      // Set the active wait time data directly from the shared function
      newLocation.averageWaitTime = activeTime.waitTime;
      newLocation.lastUpdated = activeTime.date.getTime();
      newLocation.isUserSubmitted = activeTime.isUserSubmitted;
      // Store the complete activeTime for reference
      newLocation.activeWaitTime = activeTime;
    } else {
      // If no active time, fallback to waitScore
      newLocation.waitScore = calculateWaitingScore(location.score);
    }

    return newLocation;
  });
};
