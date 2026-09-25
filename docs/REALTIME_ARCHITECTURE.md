# Relayloop real-time architecture

Relayloop uses the existing Express/tRPC server for commands and an authenticated Server-Sent Events channel for one-way operational updates. Commands remain authoritative database mutations. Each successful mutation publishes a domain event to connected users. SSE is used for the current MVP because business dashboards and riders primarily consume server-to-client updates; the browser reconnects automatically with exponential backoff. A future bidirectional WebSocket can reuse the same event envelope.

The event envelope is `{ type, occurredAt, actorUserId, deliveryId?, riderId?, payload }`. Events are emitted only after the database mutation succeeds. The initial implementation uses an in-process subscriber registry for the single WebDev process; production multi-instance scaling should move fan-out to a shared broker or reserved single-process hosting.

Event categories include delivery lifecycle, rider availability, rider location, shift, payment, and notification events. The database remains the source of truth, so reconnecting clients invalidate the affected tRPC query rather than trusting event payloads as a second database.
