# Relayloop delivery state machine

The valid delivery lifecycle is:

```text
CREATED → MATCHING → ASSIGNED → ACCEPTED → RIDER_ARRIVING → ARRIVED_AT_PICKUP → PICKED_UP → OUT_FOR_DELIVERY → ARRIVED_AT_DROP → DELIVERED
```

Cancellation is allowed from matching, assigned, accepted, arriving, and pickup states according to business policy. Failed and disputed states are terminal or admin-controlled. Every successful transition records previous status, new status, actor, timestamp, optional latitude/longitude, and metadata in `deliveryStatusHistory`.

The backend validates transitions and performs assignment claims conditionally. A second rider attempting to accept a delivery after the first successful claim receives a conflict error. Frontend checks are convenience only.
