# Webhooks: register, verify, retry

## Register an endpoint

Two ways:

- Dashboard: the user adds an endpoint at https://app.rendobar.com/webhooks.
- API or SDK: `client.webhooks.create(...)` registers one programmatically.
  The exact payload shape is in the OpenAPI spec at
  https://api.rendobar.com/openapi.json.

Registration returns a signing secret (`whsec_...`). Store it next to the API
key: env var, gitignored, never logged.

Event types: `job.created`, `job.started`, `job.completed`, `job.failed`,
`job.cancelled`, `balance.low`, `balance.depleted`. New endpoints subscribe to
`job.completed`, `job.failed`, and `job.cancelled` by default.

## Verify every delivery

Rendobar signs `${timestamp}.${rawBody}` with HMAC SHA-256 and sends:

- `x-rendobar-signature` (format `sha256=<hex>`)
- `x-rendobar-timestamp`
- `x-rendobar-signature-previous` (present during secret rotation)

Use the SDK helper. It checks the signature, the timestamp freshness (300
second tolerance by default, replay protection), and the rotation window:

```ts
import { verifyWebhook } from "@rendobar/sdk/webhooks";

// body must be the RAW request body string, not re-serialized JSON
const ok = await verifyWebhook(rawBody, req.headers, process.env.RENDOBAR_WEBHOOK_SECRET);
if (!ok) return res.status(401).send("Invalid signature");
```

`@rendobar/sdk/webhooks` has zero runtime dependencies and works in Node 18+,
Deno, Cloudflare Workers, and the browser. Non-JavaScript stacks rebuild the
same check: HMAC SHA-256 of `${timestamp}.${rawBody}` with the secret,
constant-time compare against the header value after the `sha256=` prefix.

Common failure: verifying against the parsed-then-re-stringified body. Byte
order changes and the signature no longer matches. Always keep the raw bytes.

## Retry semantics

- A delivery is considered successful on any 2xx response. Respond fast and do
  the real work after acknowledging.
- On failure Rendobar retries with exponential backoff: 10s, 20s, 40s, 80s,
  160s between attempts, capped at 300s. After retries are exhausted the
  delivery is marked `failed`.
- Delivery statuses: `pending` (still retrying), `delivered`, `failed`,
  `cancelled` (endpoint removed or disabled).
- Failed deliveries can be replayed (`client.webhooks.retryDelivery`), so
  handlers must be idempotent. Dedupe on the job id plus event type, or treat
  the webhook purely as a trigger and re-fetch the job with
  `client.jobs.get(job.id)` for authoritative state.

## Secret rotation

Rotating a secret (`client.webhooks.rotateSecret`) opens a window where
deliveries carry both the new signature and `x-rendobar-signature-previous`.
`verifyWebhook` accepts either during the window, so rotation is zero
downtime.
