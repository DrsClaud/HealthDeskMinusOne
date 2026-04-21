# Collections

## Auctions

## Chat

## Diseases

A collection of different diseases

- description: str
- match: list[str]
- name: str

## Emails

## Locations

## Medications

## Messages

## Plans

## Populations

## Registrations

## Statistics

## Unauthenticated_chat

## Urgent_care_db

## Users

- email: str
- lastName: str
- name: str
- role: "patient" | "facility" | "professional" | "admin"
- uid: str
- profile: map
  - age: int
  - sex: "male" | "female"
- stripeId: str
- stripeLink: str
- organizationId: str | null (references organizations collection)
- isOrganizationOwner: bool (true if user created the organization and owns billing)
- joinedOrganizationAt: timestamp | null

## Organizations

- id: str (document ID)
- name: str
- createdAt: timestamp
- createdBy: str (uid of user who created it)
- seats: map
  - total: number (from Stripe subscription quantity, synced by syncSubscriptionStatus trigger)
  - used: number (maintained by backend: incremented on invitation sent, decremented on member removal/invitation expired/declined)
- subscriptionOwnerId: str (uid of admin who owns the Stripe subscription)
- tokensUsedThisMonth: number (shared token pool for all professionals in org, updated by cloud functions when any member uses tokens. Limit = seats.total * 500000)
- lastTokenReset: timestamp (last time organization token pool was reset, typically start of month)

## Invitations

- organizationId: str (references organizations collection)
- email: str
- invitedBy: str (admin's uid)
- invitedByName: str
- token: str (secure random token)
- status: "pending" | "accepted" | "expired" | "revoked"
- createdAt: timestamp
- expiresAt: timestamp (7 days from creation)
- acceptedAt: timestamp | null
- acceptedBy: str | null (user uid who accepted)

## Zips

## Zips_near
