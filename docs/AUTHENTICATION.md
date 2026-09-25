# Relayloop authentication and authorization

Manus OAuth provides the authenticated session and `ctx.user`. The role is stored server-side on the user record and is never chosen by the client. Relayloop procedures use authenticated role middleware for business, rider, and admin operations.

Businesses may read and mutate only their own business profile, deliveries, shifts, wallet, and support tickets. Riders may update only their own availability, location, delivery actions, and profile. Admin procedures require the server-side admin role. Every delivery and rider mutation resolves ownership from the session user rather than trusting a client-provided business or rider id.

Anonymous users receive a sign-in CTA and cannot access operational data. The UI role selector used in the original preview is removed from the production workflow; it is not a security control.
