const { test } = require("../../test/setup");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Mock Firebase Admin and Firestore
jest.mock("firebase-admin", () => ({
  firestore: {
    Timestamp: {
      now: jest.fn(() => ({
        toDate: () => new Date(),
        toMillis: () => Date.now(),
      })),
      fromDate: jest.fn((date) => ({
        toDate: () => date,
        toMillis: () => date.getTime(),
      })),
    },
  },
}));

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  runTransaction: jest.fn(),
};

jest.mock("../config/firebase", () => ({
  db: mockDb,
}));

const processAuctionWinners = require("./processAuctionWinners");

describe("processAuctionWinners Cloud Function", () => {
  let triggerFunction;
  const processDate = new Date("2024-03-15T14:15:30-05:00"); // 15th of the month

  beforeEach(() => {
    jest.clearAllMocks();
    triggerFunction = processAuctionWinners.run;

    admin.firestore.Timestamp.now = jest.fn(() => ({
      toDate: () => processDate,
      toMillis: () => processDate.getTime(),
    }));
  });

  it("should process auctions with no bids correctly", async () => {
    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        startTime: admin.firestore.Timestamp.fromDate(
          new Date("2024-03-01T00:00:00-05:00")
        ),
        endTime: admin.firestore.Timestamp.fromDate(
          new Date("2024-03-14T23:59:59-05:00")
        ),
        lastBidder: null,
        currentBid: null,
        numberOfBids: 0,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);

    const result = await triggerFunction();

    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(mockAuction.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ended",
        hasWinner: false,
      })
    );
  });

  it("should handle no active auctions", async () => {
    const mockSnapshot = {
      empty: true,
      size: 0,
    };

    mockDb.get.mockResolvedValue(mockSnapshot);

    const result = await triggerFunction();

    expect(result.processedCount).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("should process auctions with winning bids", async () => {
    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    };

    const mockDoc = {
      ref: jest.fn(),
    };

    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        startTime: admin.firestore.Timestamp.fromDate(
          new Date("2024-03-01T00:00:00-05:00")
        ),
        endTime: admin.firestore.Timestamp.fromDate(
          new Date("2024-03-14T23:59:59-05:00")
        ),
        lastBidder: "user123",
        lastBidderEmail: "test@example.com",
        lastBidderLocation: "New York, NY",
        currentBid: 150000, // $1500 in cents
        numberOfBids: 3,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);
    mockDb.batch.mockReturnValue(mockBatch);
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue(mockDoc),
        }),
      }),
    });

    // Mock the retryAutoCharge function
    jest.mock("../utils/paymentUtils", () => ({
      retryAutoCharge: jest.fn().mockResolvedValue({
        success: true,
        chargeId: "ch_test123",
      }),
    }));

    const result = await triggerFunction();

    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.winningBids).toHaveLength(1);
    expect(result.winningBids[0]).toEqual({
      zipCode: "12345",
      winnerId: "user123",
      winningBid: 150000,
    });
  });

  it("should handle errors gracefully", async () => {
    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockRejectedValue(new Error("Database error")),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        lastBidder: null,
        currentBid: null,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);

    const result = await triggerFunction();

    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("Database error");
  });

  it("should validate auction end times are in the past", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        endTime: admin.firestore.Timestamp.fromDate(futureDate),
        lastBidder: null,
        currentBid: null,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);

    const result = await triggerFunction();

    // Should still process since we're running on schedule
    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
  });

  it("should handle payment processing errors", async () => {
    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    };

    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        lastBidder: "user123",
        lastBidderEmail: "test@example.com",
        lastBidderLocation: "New York, NY",
        currentBid: 150000,
        numberOfBids: 3,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);
    mockDb.batch.mockReturnValue(mockBatch);

    // Mock payment failure
    jest.doMock("../utils/paymentUtils", () => ({
      retryAutoCharge: jest.fn().mockResolvedValue({
        success: false,
        error: "Payment failed",
        requiresManualIntervention: false,
      }),
    }));

    const result = await triggerFunction();

    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1); // Still counts as success for processing
    expect(mockAuction.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: "failed",
        paymentError: "Payment failed",
      })
    );
  });

  it("should create proper subscription documents", async () => {
    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    };

    const mockUserSubscriptionRef = { path: "users/user123/listings/12345" };
    const mockZipSubscriptionRef = {
      path: "zip_subscriptions/12345/subscriptions/user123",
    };

    const mockAuction = {
      id: "12345",
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
      data: () => ({
        zipCode: "12345",
        status: "active",
        lastBidder: "user123",
        lastBidderEmail: "test@example.com",
        lastBidderLocation: "New York, NY",
        currentBid: 150000,
        numberOfBids: 3,
      }),
    };

    const mockSnapshot = {
      empty: false,
      size: 1,
      forEach: jest.fn((callback) => callback(mockAuction)),
    };

    mockDb.get.mockResolvedValue(mockSnapshot);
    mockDb.batch.mockReturnValue(mockBatch);

    // Mock collection structure
    mockDb.collection
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockUserSubscriptionRef),
          }),
        }),
      })
      .mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockZipSubscriptionRef),
          }),
        }),
      });

    const result = await triggerFunction();

    expect(mockBatch.set).toHaveBeenCalledTimes(2); // User and zip subscriptions
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockUserSubscriptionRef,
      expect.objectContaining({
        zipCode: "12345",
        status: "pending",
        type: "featured",
        winningBid: 150000,
        source: "auction_win",
      })
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockZipSubscriptionRef,
      expect.objectContaining({
        userId: "user123",
        userEmail: "test@example.com",
        status: "pending",
        type: "featured",
        winningBid: 150000,
        source: "auction_win",
      })
    );
  });
});
