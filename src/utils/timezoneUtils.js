/**
 * Utility functions for timezone detection and management
 */

/**
 * Get the user's browser-detected timezone
 * @returns {string} IANA timezone string (e.g., "Asia/Bangkok", "America/New_York")
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn("Failed to detect timezone:", error);
    // Fallback to UTC if detection fails
    return "UTC";
  }
};

/**
 * Get timezone display name for a given IANA timezone
 * @param {string} timezone - IANA timezone string
 * @returns {string} Human-readable timezone name
 */
export const getTimezoneDisplayName = (timezone) => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "long",
    });

    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(
      (part) => part.type === "timeZoneName"
    )?.value;

    return timeZoneName || timezone;
  } catch (error) {
    console.warn("Failed to get timezone display name:", error);
    return timezone;
  }
};

/**
 * Convert a time string to user's local time zone for display
 * @param {string} timeString - Time in HH:MM format
 * @param {string} fromTimezone - Source timezone
 * @param {string} toTimezone - Target timezone (defaults to user's timezone)
 * @returns {string} Converted time string
 */
export const convertTimeToTimezone = (
  timeString,
  fromTimezone,
  toTimezone = getUserTimezone()
) => {
  try {
    const [hours, minutes] = timeString.split(":").map(Number);

    // Create a date object with the time in the source timezone
    const today = new Date();
    const sourceDate = new Date(
      today.toLocaleString("en-CA", { timeZone: fromTimezone })
    );
    sourceDate.setHours(hours, minutes, 0, 0);

    // Convert to target timezone
    const targetDate = new Date(
      sourceDate.toLocaleString("en-CA", { timeZone: toTimezone })
    );

    // Format back to HH:MM
    const targetHours = targetDate.getHours().toString().padStart(2, "0");
    const targetMinutes = targetDate.getMinutes().toString().padStart(2, "0");

    return `${targetHours}:${targetMinutes}`;
  } catch (error) {
    console.warn("Failed to convert time between timezones:", error);
    return timeString; // Return original if conversion fails
  }
};

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - IANA timezone string to validate
 * @returns {boolean} True if timezone is valid
 */
export const isValidTimezone = (timezone) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Cache user's timezone in localStorage for quick access
 * @param {string} timezone - Timezone to cache
 */
export const cacheUserTimezone = (timezone) => {
  try {
    localStorage.setItem("userTimezone", timezone);
  } catch (error) {
    console.warn("Failed to cache timezone:", error);
  }
};

/**
 * Get cached user timezone from localStorage
 * @returns {string|null} Cached timezone or null
 */
export const getCachedUserTimezone = () => {
  try {
    return localStorage.getItem("userTimezone");
  } catch (error) {
    console.warn("Failed to get cached timezone:", error);
    return null;
  }
};

/**
 * Get user's timezone with caching and fallback logic
 * @returns {string} User's timezone (cached, detected, or fallback)
 */
export const getUserTimezoneWithFallback = () => {
  // Try cached timezone first
  const cached = getCachedUserTimezone();
  if (cached && isValidTimezone(cached)) {
    return cached;
  }

  // Try browser detection
  const detected = getUserTimezone();
  if (isValidTimezone(detected)) {
    cacheUserTimezone(detected);
    return detected;
  }

  // Fallback to UTC
  console.warn("Using UTC fallback timezone");
  return "UTC";
};
