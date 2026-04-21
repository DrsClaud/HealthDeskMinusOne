const getEnvironmentConfig = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  if (projectId.includes("sandbox")) {
    return {
      isProduction: false,
      // Clean 15-minute testing cycles
      auctionSchedule: "5,20,35,50 * * * *", // At :05, :20, :35, :50 of every hour
      retirementSchedule: "*/15 * * * *", // End auctions every 15 minutes
      timeZone: "America/New_York",

      // Enhanced testing features
      enableTimeInjection: true,
      enableDebugLogs: true,
      skipDateValidation: true,

      // Fast feedback for testing
      enableQuickTesting: true,
      testAuctionDurationMinutes: 15, // Perfect for testing
      processingDelayMinutes: 5, // Short delay between end and processing
    };
  }

  return {
    isProduction: true,
    auctionSchedule: "15 14 15 * *", // 2:15 PM on the 15th of every month
    retirementSchedule: "0 14 15 * *", // 2:00 PM on the 15th of every month
    timeZone: "America/New_York",
    enableTimeInjection: false,
    enableDebugLogs: false,
    skipDateValidation: false,
    enableQuickTesting: false,
  };
};

module.exports = { getEnvironmentConfig };
