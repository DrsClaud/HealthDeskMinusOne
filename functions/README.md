# HealthDesk Firebase Functions

This directory contains the Firebase Cloud Functions for the HealthDesk application.

## Functions Overview

The codebase includes several function groups:

- **ads**: Ad management functions
- **auth**: Authentication-related functions
- **auctions**: ZIP code auction system functions

## Testing Functions

### Testing Auction Functions

The auction system includes several functions that run on a monthly schedule (15th of each month). For testing these functions outside the normal schedule, we've implemented debug endpoints that can be accessed directly via browser URL.

#### How to Test Using Browser URLs

1. Deploy the functions:

   ```
   firebase deploy --only functions
   ```

2. To test auction functions, visit the function URL in your browser with a debug key:

   ```
   https://us-central1-yourprojectid.cloudfunctions.net/debugExpireSubscriptions?key=your-secret-debug-key
   ```

   ```
   https://us-central1-yourprojectid.cloudfunctions.net/debugProcessAuctionWinners?key=your-secret-debug-key
   ```

   ```
   https://us-central1-yourprojectid.cloudfunctions.net/debugCleanupAndResetAuctions?key=your-secret-debug-key
   ```

3. The functions will execute and return a JSON response with the results

#### Testing Sequence

For a full auction cycle test, run the functions in this order:

1. First, expire old subscriptions: `debugExpireSubscriptions`
2. Then process auction winners and charge them: `debugProcessAuctionWinners`
3. Finally, cleanup and reset auctions for next cycle: `debugCleanupAndResetAuctions`

This simulates the complete auction cycle that would happen automatically on the 15th of each month.

## Deployment

To deploy specific functions:

```
firebase deploy --only functions:functionName
```

Example:

```
firebase deploy --only functions:expireSubscriptions
```
