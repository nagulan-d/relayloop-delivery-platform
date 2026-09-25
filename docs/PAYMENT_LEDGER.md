# Relayloop payment ledger

The MVP uses internal/demo payment records, clearly separated from a real payment gateway. Pricing is calculated server-side. On successful completion, the backend writes the business charge, rider earning, and platform commission in one transaction. The same database transaction updates the associated wallet balances or payable balances.

A future Razorpay sandbox integration should be webhook-first: provider webhook verification precedes ledger posting. The frontend must never mark a payment successful on its own, and no card details are stored by Relayloop.
