const admin = require("firebase-admin");
const { getNextAuctionEndDate } = require("./dateUtils");

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  firestore: {
    Timestamp: {
      fromDate: jest.fn((date) => ({
        toDate: () => date,
        toMillis: () => date.getTime(),
      })),
    },
  },
}));

describe("getNextAuctionEndDate Helper Function", () => {
  it("should return current month's 15th if we haven't reached it yet", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use January 10, 2024 (before the 15th)
    const mockDate = new Date(2024, 0, 10, 10, 0, 0);

    // Mock Date constructor
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const endDate = getNextAuctionEndDate();

      // Should return January 15th, 2024 at 2PM
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0); // January (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Restore the original Date
      global.Date = RealDate;
    }
  });

  it("should return next month's 15th if we've passed current month's 15th", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use January 20, 2024 (after the 15th)
    const mockDate = new Date(2024, 0, 20, 10, 0, 0);

    // Mock Date constructor
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const endDate = getNextAuctionEndDate();

      // Should return February 15th, 2024 at 2PM
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(1); // February (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Restore the original Date
      global.Date = RealDate;
    }
  });

  it("should return next month's 15th if today is exactly the 15th but after 2PM", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use January 15, 2024 at 3PM (after the 2PM auction time)
    const mockDate = new Date(2024, 0, 15, 15, 0, 0);

    // Mock Date constructor
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const endDate = getNextAuctionEndDate();

      // Should return February 15th, 2024 at 2PM
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(1); // February (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Restore the original Date
      global.Date = RealDate;
    }
  });

  it("should return current month's 15th if today is exactly the 15th but before 2PM", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use January 15, 2024 at 1PM (before the 2PM auction time)
    const mockDate = new Date(2024, 0, 15, 13, 0, 0);

    // Mock Date constructor
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const endDate = getNextAuctionEndDate();

      // Should return January 15th, 2024 at 2PM (same day)
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0); // January (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Restore the original Date
      global.Date = RealDate;
    }
  });

  it("should handle year boundaries correctly", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use December 20, 2024 (after the 15th, near year end)
    const mockDate = new Date(2024, 11, 20, 10, 0, 0);

    // Mock Date constructor
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const endDate = getNextAuctionEndDate();

      // Should return January 15th, 2025 at 2PM
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0); // January (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Restore the original Date
      global.Date = RealDate;
    }
  });
});
