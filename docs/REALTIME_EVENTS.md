# Relayloop realtime events

| Event | Produced when | Consumers |
|---|---|---|
| `DELIVERY_CREATED` | Business delivery record is created | Business, rider, admin |
| `DELIVERY_MATCHING` | Eligible rider offers are generated | Business, admin |
| `DELIVERY_OFFERED` | A rider receives a persisted offer | Rider |
| `DELIVERY_ACCEPTED` | A rider accepts | Business, rider, admin |
| `RIDER_ASSIGNED` | Atomic claim succeeds | Business, admin |
| `RIDER_ONLINE` / `RIDER_OFFLINE` | Rider availability changes | Business, admin |
| `RIDER_LOCATION_UPDATED` | Throttled GPS update is accepted | Business, admin |
| `DELIVERY_STATUS_UPDATED` | Valid lifecycle transition succeeds | Business, rider, admin |
| `DELIVERY_COMPLETED` | OTP completion is verified | Business, rider, admin |
| `PAYMENT_POSTED` | Ledger entries are committed | Business, rider, admin |
| `NOTIFICATION_CREATED` | A domain event creates a notification | Target user |

Events are notifications, not a replacement for database queries. Clients invalidate the narrow affected query and re-render from authoritative state.
