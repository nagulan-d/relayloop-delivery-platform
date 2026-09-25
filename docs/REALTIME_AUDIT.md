# Relayloop real-time audit

| Feature | Current state | Real / mock / partial | Current source | Required change | Priority |
|---|---|---|---|---|---|
| Authentication | Manus OAuth session is wired and `protectedProcedure` rejects anonymous calls | Partial | `server/_core/context.ts`, `server/_core/trpc.ts` | Add role onboarding and role-specific procedures; remove preview selector from production path | P0 |
| Role model | Users only have `user`/`admin`; UI switches business/rider/admin locally | Mock/partial | `drizzle/schema.ts`, `client/src/pages/Home.tsx` | Store `business`/`rider` roles and derive UI from authenticated user | P0 |
| Dashboard KPIs | Overview values are hard-coded in `demoOverview` | Mock | `server/routers.ts` | Replace with aggregate queries scoped to the authenticated account | P0 |
| Delivery list | Server list query exists but UI renders `initialDeliveries` | Partial/mock | `server/db.ts`, `Home.tsx` | Render database deliveries and empty/loading/error states | P0 |
| Delivery creation | Server calculates price and writes a delivery when authenticated | Partial | `deliveries.create` | Bind to business ownership, create offers, ledger entries, and events | P0 |
| Matching | No eligible-rider query or persisted offers | Mock | `deliveries.create` | Score online riders by distance, workload, rating, reliability, and service radius | P0 |
| Acceptance concurrency | State transition helper updates by id without atomic claim | Unsafe/partial | `transitionDelivery`, router | Conditional update inside a transaction and reject the second claimant | P0 |
| Availability | Procedure accepts an arbitrary rider id | Unsafe/partial | `riders.setAvailability` | Resolve rider from authenticated user and publish status events | P0 |
| GPS | Map uses decorative coordinates and rider dots | Mock | `CoveragePanel`, CSS map | Add browser geolocation, persist latest coordinates, publish location events, and show unavailable state | P1 |
| Real-time transport | No server event channel | Missing | — | Add authenticated SSE channel with reconnect and event publishing | P0 |
| Status history | History table exists but does not capture previous state/location | Partial | `deliveryStatusHistory` | Store full transition audit metadata and enforce actor/ownership checks | P0 |
| Hourly shifts | Table exists but no create/offer/accept workflow | Missing | `hourlyShifts` only | Add shift assignments, overlap checks, and events | P1 |
| Notifications | Table exists but no backend creation or UI query | Missing | `notifications` only | Create notifications from domain events and show unread count | P1 |
| Ledger | Transaction table exists but dashboard values are not ledger-backed | Partial/mock | `transactions`, `demoOverview` | Post business charge, rider earning, and commission atomically at completion | P1 |
| Proof of delivery | No OTP or proof table | Missing | — | Add OTP generation, hash verification, and completion gate | P1 |
| Admin monitoring | `platformSnapshot` is hard-coded | Mock | `server/routers.ts` | Query live counts and subscribe to operational events | P1 |
| Tests | Auth logout and pure router tests exist | Partial | `server/*.test.ts` | Add ownership, matching, atomic-claim, and transition tests | P0 |

## Reusable assets

The existing React visual system, dashboard layout, Manus OAuth scaffolding, Drizzle setup, tRPC contracts, strict delivery status vocabulary, pricing formula, and responsive CSS can be reused. The primary replacement is the source of operational truth: hard-coded UI state must be replaced with authenticated queries and mutations.

## Upgrade sequence

1. Establish role onboarding and role-aware procedures.
2. Add database-backed dashboard queries and delivery rows.
3. Implement matching offers and atomic acceptance.
4. Add authenticated server-sent events with reconnect behavior.
5. Add rider availability and browser GPS updates.
6. Add OTP completion, notifications, and ledger posting.
7. Add hourly shifts, admin operations, and security/ownership tests.

The current project can remain a cohesive product while these changes are introduced incrementally.
