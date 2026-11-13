# Workflow automation with self-hosted n8n

Student Kare can tell a self-hosted n8n that something operational happened, so n8n
can alert the team, keep counts and run schedules. It is off by default.

## What n8n receives, and what it never does

For each allow-listed event the backend posts:

```json
{"events": [{"id": "…", "kind": "ORDER_PAID", "domain": "MARKETPLACE", "severity": "INFO", "at": 1794600000}]}
```

Nothing else. No account, provider, order or record id; no summary text; no clinical,
pharmacy, lab or safety event. The allow-list is `ALLOWED_KINDS` and `ALLOWED_DOMAINS`
in `backend/services/automation_hook.py`; changing either is a privacy decision and
needs review.

n8n is given **no credentials for the application database** and must not be given
any. A workflow that needs detail links a person to the admin console.

Keep these out of n8n entirely; they stay in the app's own scheduler: medicine and
appointment reminders, lab results, consent, erasure, SOS and crisis delivery.

## Events available

| Kind | Meaning |
|---|---|
| `ORDER_PAID`, `LAB_BOOKING_PAID` | A payment completed |
| `ORDER_PAYMENT_EXPIRED`, `LAB_BOOKING_EXPIRED` | Not paid in time; stock or slot released |
| `PAYMENT_AMOUNT_MISMATCH` | The gateway reported a different amount: look at once |
| `PAYMENT_NEEDS_REFUND`, `ORDER_REFUND_UNAVAILABLE` | A refund is owed or could not be made |
| `ORDER_REFUNDED`, `RETURN_REQUESTED`, `RETURN_PICKED_UP` | Refund and return progress |
| `MEDICINE_CREATED`, `LEGAL_DOCUMENT_PUBLISHED` | Catalogue and legal content changes |
| `CAMP_PROPOSED`, `CONTRACT_SEAT_RELEASED` | Campus and contract activity |
| `DELETION_REQUESTED` | An erasure clock started |
| `NAMED_SUPER_ADMIN_CREATED`, `TWO_FACTOR_RESET` | Security-relevant account changes |

## Switching it on

1. Start n8n. It keeps its own data, including the key that encrypts saved
   credentials, in the `n8n-data` volume: back that volume up.

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile automation up -d n8n
   ```

2. Open the editor through an SSH tunnel. It listens on the host's loopback only:

   ```sh
   ssh -L 5678:127.0.0.1:5678 <host>     # then http://localhost:5678
   ```

   Create the owner account with a strong password and turn on two-factor sign-in.

3. In n8n, create a workflow that starts with a **Webhook** node (POST) and copy its
   production URL path.

4. Give the backend and the worker these three values, then restart them:

   ```sh
   AUTOMATION_HOOK_ENABLED=true
   AUTOMATION_HOOK_URL=http://n8n:5678/webhook/<path from step 3>
   AUTOMATION_HOOK_SECRET=<openssl rand -hex 32>
   ```

   The address and secret are read from the environment only. With any of the three
   missing, nothing is sent.

## Verifying the signature in n8n

Every request carries `X-SK-Timestamp` and `X-SK-Signature`. Put a **Code** node
straight after the Webhook node and stop the workflow when it throws:

```js
const crypto = require('crypto');
const secret = $env.SK_HOOK_SECRET;                 // same value as AUTOMATION_HOOK_SECRET
const { headers, body } = $input.first().json;
const timestamp = headers['x-sk-timestamp'];
const expected = crypto.createHmac('sha256', secret)
  .update(`${timestamp}.${JSON.stringify(body)}`).digest('hex');
const given = headers['x-sk-signature'] ?? '';
const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) < 300;
if (!fresh || given.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
  throw new Error('Rejected: bad signature or stale request');
}
return body.events.map(event => ({ json: event }));
```

The backend sends compact JSON with keys in alphabetical order, so `JSON.stringify(body)`
reproduces the signed bytes. Set `SK_HOOK_SECRET` in the n8n service environment, and
allow `crypto` in Code nodes for this instance if your n8n version restricts built-in
modules. This snippet has not been run against a live n8n; test it with one event
before relying on it.

## Delivery behaviour

- The `automation_hook` job runs every 2 minutes and sends up to 50 events per pass.
- A batch that n8n does not accept (non-2xx, timeout) is retried on the next pass.
- An event older than 6 hours is no longer offered.
- An accepted event is recorded in `care_automation_deliveries` and never sent again.
  Make workflows idempotent on `id` anyway.

## First workflows worth building

1. Post `PAYMENT_AMOUNT_MISMATCH`, `ORDER_REFUND_UNAVAILABLE` and `PAYMENT_NEEDS_REFUND` to the ops channel.
2. Count `ORDER_PAID` and `LAB_BOOKING_PAID` per day and send a morning summary.
3. Alert when `DELETION_REQUESTED` events are waiting, so the erasure window is never missed.
4. Alert on `NAMED_SUPER_ADMIN_CREATED` and `TWO_FACTOR_RESET`.

## Upgrading n8n

The image is pinned (`n8nio/n8n:2.44.6`). n8n 3.0 is a major release with breaking
changes; read its migration notes and back up the `n8n-data` volume before moving to it.
