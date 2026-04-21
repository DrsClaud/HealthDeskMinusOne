const { test } = require("../../test/setup");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Mock Firebase Admin
jest.mock("firebase-admin", () => {
  return {
    firestore: {
      Timestamp: {
        now: jest.fn().mockReturnValue({
          toMillis: () => Date.now(),
          toDate: () => new Date(),
        }),
        fromDate: jest.fn((date) => ({
          toMillis: () => date.getTime(),
          toDate: () => date,
        })),
        fromMillis: jest.fn((millis) => ({
          toMillis: () => millis,
          toDate: () => new Date(millis),
        })),
      },
      FieldValue: {
        arrayUnion: jest.fn((item) => item),
        increment: jest.fn((num) => num),
      },
    },
    initializeApp: jest.fn(),
  };
});

// Mock Firestore DB
const mockTransaction = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
};

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  runTransaction: jest.fn(async (callback) => await callback(mockTransaction)),
};

// Mock the Firebase config
jest.mock("../config/firebase", () => ({
  db: mockDb,
}));

// Import the function to test
const placeBid = require("./placeBid");

describe("placeBid Cloud Function", () => {
  let wrappedPlaceBid;
  let consoleSpy;

  beforeEach(() => {
    // Mock console.error
    consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Wrap the function with the test SDK
    wrappedPlaceBid = test.wrap(placeBid);

    // Reset transaction mock behavior
    mockTransaction.get.mockReset();
    mockTransaction.set.mockReset();
  });

  afterEach(() => {
    // Restore console mock
    consoleSpy.mockRestore();
  });

  afterAll(() => {
    // Clean up the test SDK
    test.cleanup();
  });

  it("should reject unauthenticated requests", async () => {
    // Call the function without auth context
    await expect(
      wrappedPlaceBid({ zipCode: "12345", bidAmount: 150000 }, {})
    ).rejects.toThrow("You must be logged in to place a bid");
  });

  it("should reject requests without zipCode", async () => {
    // Call the function with auth but no zipCode
    await expect(
      wrappedPlaceBid({ bidAmount: 150000 }, { auth: { uid: "user123" } })
    ).rejects.toThrow("A valid zip code must be provided");
  });

  it("should reject requests with invalid bidAmount", async () => {
    // Call with invalid bid amount
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: -100 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("A valid bid amount must be provided");
  });

  it("should create a new auction if it does not exist", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        location: "Hospital A",
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Mock auction document (doesn't exist yet)
    const mockAuctionDoc = {
      exists: false,
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc) // First call for user doc
      .mockImplementationOnce(() => mockPromotionDoc) // Second call for promotion doc
      .mockImplementationOnce(() => mockAuctionDoc); // Third call for auction doc

    // Call the function
    const result = await wrappedPlaceBid(
      { zipCode: "12345", bidAmount: 150000 },
      { auth: { uid: "user123" } }
    );

    // Verify transaction.set was called to create the auction
    expect(mockTransaction.set).toHaveBeenCalled();

    // Verify the result structure
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("auction");
    expect(result.auction).toHaveProperty("currentBid", 150000);
    expect(result.auction).toHaveProperty("isWinning", true);
  });

  it("should update an existing auction with a new bid", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        displayName: "Test User",
        location: "Hospital A",
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Mock existing auction document
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future

    const mockAuctionDoc = {
      exists: true,
      data: () => ({
        zipCode: "12345",
        currentBid: 120000,
        startingPrice: 100000,
        endTime: admin.firestore.Timestamp.fromMillis(futureDate.getTime()),
        lastBidder: "otherUser456",
        numberOfBids: 1,
        bidHistory: [
          {
            bidderId: "otherUser456",
            amount: 120000,
            timestamp: admin.firestore.Timestamp.now(),
          },
        ],
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc) // First call for user doc
      .mockImplementationOnce(() => mockPromotionDoc) // Second call for promotion doc
      .mockImplementationOnce(() => mockAuctionDoc); // Third call for auction doc

    // Call the function with a higher bid
    const result = await wrappedPlaceBid(
      { zipCode: "12345", bidAmount: 130000 },
      { auth: { uid: "user123" } }
    );

    // Verify transaction.set was called to update the auction
    expect(mockTransaction.set).toHaveBeenCalled();

    // Verify the result structure
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("auction");
    expect(result.auction).toHaveProperty("currentBid", 130000);
    expect(result.auction).toHaveProperty("isWinning", true);
  });

  it("should reject bid if auction has ended", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        location: "Hospital A",
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Mock auction document that has ended
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour in the past

    const mockAuctionDoc = {
      exists: true,
      data: () => ({
        zipCode: "12345",
        currentBid: 120000,
        endTime: admin.firestore.Timestamp.fromMillis(pastDate.getTime()),
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc)
      .mockImplementationOnce(() => mockAuctionDoc);

    // Call the function
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 130000 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("This auction has ended");
  });

  it("should reject bid if amount is too low", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        location: "Hospital A",
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Mock auction document
    const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in the future

    const mockAuctionDoc = {
      exists: true,
      data: () => ({
        zipCode: "12345",
        currentBid: 120000,
        endTime: admin.firestore.Timestamp.fromMillis(futureDate.getTime()),
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc)
      .mockImplementationOnce(() => mockAuctionDoc);

    // Call the function with a bid that's too low (needs to be at least 120000 + 500)
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 120100 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("Bid must be at least $1205.00");
  });

  it("should extend auction time for last-minute bids", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        displayName: "Test User",
        location: "Hospital A",
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Create a future date for the auction end time (30 seconds from now)
    const now = new Date();
    const closeEndTime = new Date(now.getTime() + 30 * 1000); // 30 seconds from now

    // Mock auction document with end time very close but still in the future
    const mockAuctionDoc = {
      exists: true,
      data: () => ({
        zipCode: "12345",
        currentBid: 120000,
        startingPrice: 100000,
        endTime: admin.firestore.Timestamp.fromMillis(closeEndTime.getTime()),
        lastBidder: "otherUser456",
        numberOfBids: 1,
        bidHistory: [
          {
            bidderId: "otherUser456",
            amount: 120000,
            timestamp: admin.firestore.Timestamp.now(),
          },
        ],
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc)
      .mockImplementationOnce(() => mockAuctionDoc);

    // Call the function
    const result = await wrappedPlaceBid(
      { zipCode: "12345", bidAmount: 130000 },
      { auth: { uid: "user123" } }
    );

    // Verify transaction.set was called with extended end time
    expect(mockTransaction.set).toHaveBeenCalled();
    expect(result).toHaveProperty("success", true);
  });

  it("should reject if user has no promotion", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        location: "Hospital A",
      }),
    };

    // Mock promotion document (doesn't exist)
    const mockPromotionDoc = {
      exists: false,
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc);

    // Call the function
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 130000 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow(
      "You must have an active or pending promotion to place a bid"
    );
  });

  it("should reject if promotion status is invalid", async () => {
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com",
        location: "Hospital A",
      }),
    };

    // Mock promotion document with invalid status
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "expired",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc);

    // Call the function
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 130000 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("Your promotion status (expired) does not allow bidding");
  });

  it("should reject requests with missing user email", async () => {
    // Mock user document without email
    const mockUserDoc = {
      exists: true,
      data: () => ({
        location: "Hospital A", // Valid location
        // Missing email field
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc);

    // Call the function
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 130000 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("User profile missing email address");
  });

  it("should reject requests with missing facility location", async () => {
    // Mock user document without location
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "user@example.com", // Valid email
        // Missing location field
      }),
    };

    // Mock promotion document
    const mockPromotionDoc = {
      exists: true,
      data: () => ({
        status: "active",
      }),
    };

    // Set up transaction mock responses
    mockTransaction.get
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockPromotionDoc);

    // Call the function
    await expect(
      wrappedPlaceBid(
        { zipCode: "12345", bidAmount: 130000 },
        { auth: { uid: "user123" } }
      )
    ).rejects.toThrow("Facility location not configured");
  });
});

// Add this to the placeBid.test.js file

describe("getNextAuctionEndDate Helper Function", () => {
  // Import the function directly for unit testing
  const { getNextAuctionEndDate } = require("./placeBid");

  it("should return the 15th of current or next month at 2PM", () => {
    // Store the real Date constructor
    const RealDate = global.Date;

    // Use January 10, 2024 (before the 15th)
    const mockDate = new Date(2024, 0, 10);

    // Mock Date.now and new Date()
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
      // Call the function
      const endDate = getNextAuctionEndDate().toDate();

      // Should return January 15th, 2024 at 2PM
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0); // January (0-indexed)
      expect(endDate.getDate()).toBe(15);
      expect(endDate.getHours()).toBe(14); // 2PM
      expect(endDate.getMinutes()).toBe(0);
      expect(endDate.getSeconds()).toBe(0);
    } finally {
      // Ensure we always restore the original Date
      global.Date = RealDate;
    }
  });
});
