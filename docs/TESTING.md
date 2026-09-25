# Relayloop multi-user testing

1. Authenticate a business account and a rider account in separate browser sessions.
2. Put the rider offline; confirm a delivery does not offer to that rider.
3. Put the rider online; confirm the database changes and the business/admin view receives an availability event.
4. Create a delivery from the business; confirm a persisted delivery and rider offer appear.
5. Have two eligible riders accept nearly simultaneously; confirm one succeeds and the other receives a conflict.
6. Move the accepted rider through pickup, delivery, and OTP completion; confirm business and rider views update without refresh.
7. Confirm delivery history and three ledger postings are present after completion.
8. Send browser GPS updates; confirm the business map displays actual rider coordinates or `Location unavailable`.
9. Create overlapping hourly shifts; confirm the second assignment is rejected.
10. Disconnect and reconnect the SSE channel; confirm the client invalidates state and recovers.

Automated tests cover role middleware, server-side pricing, state transitions, ownership, and atomic-claim behavior. Browser verification covers the responsive rider workflow and event-driven status updates.
