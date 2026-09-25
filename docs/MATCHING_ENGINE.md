# Relayloop matching engine

When a business creates a delivery, the server selects riders who are approved, online, within their service radius, compatible with the delivery, and free of conflicting assignments. The server calculates a transparent score:

- 30% distance score
- 20% availability score
- 20% workload score
- 10% vehicle compatibility
- 10% rating
- 10% reliability

The decision is persisted as an offer with the score. Offers are ordered by score and expire when the delivery is cancelled or another rider atomically claims it. If no rider qualifies, the delivery remains in matching and the business receives a truthful `No available riders nearby` state.
