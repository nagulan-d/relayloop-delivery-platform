# Relayloop security audit

The existing Manus OAuth session, protected tRPC middleware, parameter validation with Zod, Drizzle query builder, secure session cookie handling, and server-only environment variables are retained. The upgrade removes client-selected roles from authorization and resolves ownership from the authenticated session.

Before production launch, add rate limits to login-adjacent and offer endpoints, strict CORS/origin policy, audit logs for admin actions, upload validation for proof photos, CSP headers, and a shared event broker for multiple server instances. Test IDOR cases explicitly: one business must not read another business's delivery, a rider must not mutate another rider's availability, and only admins can access platform-wide metrics.
