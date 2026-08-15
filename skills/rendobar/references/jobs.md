# Jobs: submit, wait, and collect results

## The live catalog rule

The set of runnable job types is defined by the API, not by this document.
Before choosing a job type:

1. `GET https://api.rendobar.com/jobs/types` (public, no auth) lists every
   live job type.
2. `GET https://api.rendobar.com/jobs/types/{type}/schema` returns the exact
   parameter schema for one type.

Capability families you can expect to find there: FFmpeg processing, media
probing (ffprobe), composition, compression to a target size, caption
animation and burning, and image generation, editing, and upscaling. The
catalog is the truth for what exists today and what each type accepts. Never
submit a type or a parameter the catalog does not list.

## Submit

SDK:

```ts
import { createClient } from "@rendobar/sdk";

const client = createClient({ apiKey: process.env.RENDOBAR_API_KEY });

const job = await client.jobs.create({
  type: "ffprobe",
  params: { command: "https://cdn.rendobar.com/assets/examples/sample.mp4" },
  idempotencyKey: "order-1234-probe", // dedupes retries
});
```

REST:

```bash
curl -X POST https://api.rendobar.com/jobs \
  -H "Authorization: Bearer $RENDOBAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"ffprobe","params":{"command":"https://cdn.rendobar.com/assets/examples/sample.mp4"}}'
```

## Where the media URL goes

This is the single easiest thing to get wrong, because it is not the same for
every type. Read `GET /jobs/types/{type}/schema` before building the body.

| Type | Media URL goes in |
|---|---|
| `ffprobe` | `params.command`, which is a raw ffprobe command whose minimal form is just the URL |
| `ffmpeg` | `params.command`, with `inputs` mapping the filenames used inside that command |
| Everything else | `inputs`, with options in `params` |

Sending the wrong shape is safe but wasted: the API rejects it with
`VALIDATION_ERROR` and a `details` array naming the exact missing path, for
example `path: ["command"]`. Read that path and fix the body.

Rules:

- Media inputs are URLs. For local files, upload through the assets flow
  (`POST https://api.rendobar.com/assets`) first and pass the returned asset
  url as the input.
- Pass an `idempotencyKey` anywhere a retry could double-submit.
- One job produces exactly one output. There is no batch endpoint. To process
  N files, submit N jobs.

## Collect results

Three patterns, in order of preference for production use:

### 1. Webhooks (production servers)

Register an endpoint and receive `job.completed` and `job.failed` events with
signature verification. See [webhooks.md](webhooks.md).

### 2. Per-job callback (one-off delivery, no endpoint registration)

`client.jobs.create` accepts a `callback: { url }` option. On a terminal state
Rendobar POSTs the job envelope to that URL. Set `verify: true` to have the
POST signed with the same HMAC scheme as webhooks.

### 3. Poll or wait (scripts and CLIs)

```ts
const done = await client.jobs.wait(job.id); // polls with backoff, 5 min default timeout
console.log(done.status, done.output);
```

`client.jobs.get(job.id)` is a single status read. On REST, poll
`GET https://api.rendobar.com/jobs/{id}`.

## Response envelope

Single resources come back as `{ data: ... }`, lists as
`{ data: [...], meta: { total, page, limit } }`. The SDK unwraps the envelope
for you. Errors use the shape in [errors.md](errors.md).
