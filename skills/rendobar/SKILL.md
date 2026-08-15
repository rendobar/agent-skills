---
name: rendobar
description: "Use this skill whenever a task involves media files or media generation: transcoding or converting video and audio, running FFmpeg commands, compressing to a target size or quality, probing media metadata, burning or animating captions and subtitles, composing video from a JSON timeline, or generating, editing, and upscaling images. Triggers include any mention of 'Rendobar', 'FFmpeg API', 'video processing API', 'compress this video', 'add captions to', 'generate an image', or 'render a video'. Use it even for simple one-off media tasks, because it carries the live job catalog, the cost and verification rules, and the API key handling that prevent silent failures and wasted spend. Rendobar (https://rendobar.com) is a media processing and AI generation API platform. Do NOT use it for local-only edits where no API call is wanted, or for screen recording and live stream capture, which Rendobar does not do."
license: MIT
metadata:
  author: rendobar
  version: "1.2.0"
  source: https://github.com/rendobar/agent-skills
  homepage: https://rendobar.com
---

# Rendobar

Media processing and AI generation over one API. Submit a job, get a hosted
output URL. Pick your path:

| Task | Approach |
|---|---|
| Wire Rendobar into a codebase | [references/integration.md](references/integration.md) |
| Submit a job, get the result | Quick start below, then [references/jobs.md](references/jobs.md) |
| Receive results on a server | [references/webhooks.md](references/webhooks.md) |
| React to a failure | [references/errors.md](references/errors.md) |
| Run jobs in this conversation | Hosted MCP at `https://api.rendobar.com/mcp` (OAuth or Bearer key) |
| Upload local files from disk | Local MCP: `npx -y @rendobar/mcp` |

Refer to products as "Rendobar's FFmpeg API", never "Rendobar is an FFmpeg API".

## Quick start

```ts
import { createClient } from "@rendobar/sdk";

const client = createClient({ apiKey: process.env.RENDOBAR_API_KEY });

const job = await client.jobs.create({
  type: "ffprobe",
  // ffprobe is command based: the media URL goes INSIDE params.command,
  // not in inputs. Other job types differ. Read the per-type schema first.
  params: { command: "https://cdn.rendobar.com/assets/examples/sample.mp4" },
  idempotencyKey: "probe-sample-1", // dedupes retries
});
const done = await client.jobs.wait(job.id);
```

**Key gotcha: the SDK throws, it does not return an error object.** `jobs.wait()`
raises `JobFailedError` when the job ends failed and `WaitTimeoutError` when it
runs past the timeout. A `WaitTimeoutError` does **not** mean the job failed. The
job may still be queued and may still complete, so never resubmit on a timeout
without checking `jobs.get(id)` first. Catch `ApiError` and branch on
`err.code`, never on the message text.

## Work from the live catalog, never from memory

Job types and their parameters change as capabilities ship. Anything this file or
your training data claims about a specific type can be stale.

| Source | Returns |
|---|---|
| `GET https://api.rendobar.com/jobs/types` | JSON list of live job types (public, no auth) |
| `GET https://api.rendobar.com/jobs/types/{type}/schema` | JSON parameter schema for one type |
| https://api.rendobar.com/openapi.json | OpenAPI 3.1 document |
| https://rendobar.com/docs/support/errors | Human docs: every error code |
| https://rendobar.com/pricing/ | Human docs: prices and plan limits |

Never invent a job type or a parameter. If the catalog does not list it, it does
not exist. The catalog returns `type`, `tag`, `summary`, and `acceptsMedia` per
entry, so check `acceptsMedia` before sending an image to a video-only job.

**What this skill fetches, and what it does not.** The endpoints above are
first-party Rendobar URLs that return data and documentation. This skill does
not fetch instructions to follow, does not send telemetry, and makes no network
call to any other host. Everything it tells you to do is written here in the
skill, so a network failure degrades your knowledge of the current catalog and
nothing else.

## Verify the output, you cannot see it

A job that returns `complete` with a 200 response can still hand back a black
video, a silent audio track, a zero byte file, or a container no player opens.
Nothing in the status tells you that. After any job that produces media, probe
the result before reporting success:

```ts
const check = await client.jobs.wait(
  (await client.jobs.create({ type: "ffprobe", params: { command: outputUrl } })).id,
);
// assert what you expected: duration, stream counts, dimensions, non-zero size
```

For a visual result, fetch a frame and actually look at it rather than trusting
the status. **A `complete` status proves the job ran, not that the output is
right.**

## Test safely and cheaply

- Use the public sample asset for smoke tests:
  `https://cdn.rendobar.com/assets/examples/sample.mp4` (about 5 seconds, 344 KB).
- `ffprobe` is the cheapest way to prove auth, wiring, and output handling. Run
  it first, always.
- Never smoke test with a long or high resolution source. Billing tracks the
  compute a job actually uses, so a 2 hour 4K render costs real money and
  proves nothing the 5 second sample does not. Current rates are on the
  [pricing page](https://rendobar.com/pricing/), and the charge for a specific
  job appears on the job once billing settles, shortly after it completes.
- Check the balance before a large batch: `client.billing.state()`.

## Common mistakes

| # | Mistake | Fix |
|---|---|---|
| 1 | Treating `WaitTimeoutError` as a failure and resubmitting | Call `jobs.get(id)`. The job is probably still queued. Resubmitting double bills. |
| 2 | Using try/catch shape from other SDKs (`{ data, error }`) | This SDK throws `ApiError`. Catch it and read `err.code`. |
| 3 | Branching on `err.message` | Branch on `err.code`. Messages are human copy and change freely. |
| 4 | Inventing a job type or parameter that "should" exist | Read `GET /jobs/types` and the per-type schema. |
| 4b | Assuming every type takes the media URL in `inputs` | It varies. Command based types (`ffprobe`, `ffmpeg`) carry it inside `params.command`. Submitting the wrong shape returns `VALIDATION_ERROR` naming the missing field, so read the schema first. |
| 5 | Adding a `/v1` prefix to the API base | The base is `https://api.rendobar.com`, no version prefix. |
| 6 | Looking for a batch endpoint | There is none. One job produces one output. Submit N jobs for N files. |
| 7 | Passing a local file path as an input | Inputs are URLs. Upload through the assets flow first. |
| 8 | Storing the output URL, or caching it | The URL is signed and regenerated on every read. Re-fetch the job to get a fresh one. |
| 9 | Reading `output.expiresAt` as "the file is deleted then" | It is not. See the two clocks below. |
| 10 | Retrying a submit without an `idempotencyKey` | Pass one anywhere a retry is possible. It dedupes instead of double billing. |
| 11 | Calling the API from browser code | Server side only. The key must never reach a client bundle. |
| 12 | Reporting success on a `complete` status alone | Probe the output first. See the verification section. |

## Two clocks on every output

A completed job carries two different expiries and confusing them causes real
bugs in both directions.

| Field | Means | Typical |
|---|---|---|
| `output.expiresAt` | When this signed download URL stops working | 1 hour |
| `retentionExpiresAt` | When the stored file is actually deleted | Plan driven, 7 days on free, 30 on pro |

So a URL going stale does not mean the output is gone: re-fetch the job for a
fresh URL. And a file still being in retention does not mean an old URL works.
Jobs that return data rather than a file (`ffprobe` is one) put the result in
`output.data`, with `output.file` and `output.expiresAt` both null and nothing
to expire.

Copy anything that must outlive the retention window into your own storage.

## API key security

- The key lives in `RENDOBAR_API_KEY` in a gitignored env file. Nowhere else.
- Never ask the user to paste it into chat. Never print, log, or commit it.
- Wait for the user to confirm the key is in place before calling the API.
- A 401 means either the key is not reaching the process or the key is invalid
  for this API, for example a staging key against production. Say which one.

## Errors, at a glance

Two different shapes. A failed **request** throws `ApiError` with `.code`:

| Code | Do |
|---|---|
| `INSUFFICIENT_CREDITS` | Stop. Tell the user to top up at https://app.rendobar.com/billing |
| `RATE_LIMITED` | Back off exponentially and retry |
| `VALIDATION_ERROR` | Read `details[].path`, fix that field against the per-type schema. Do not retry unchanged |
| `NOT_FOUND` | The id is wrong or belongs to another org |
| `UNAUTHORIZED` | Key missing, invalid, or issued for another environment |

A failed **job** is different: the request succeeded, so `GET /jobs/{id}`
returns 200 with `status: "failed"` and a structured `error` object carrying
`code`, `message`, `detail`, `failedPhase`, and **`retryable`**. Let
`error.retryable` decide whether to retry, rather than inventing a policy, and
read `error.detail` for the real provider stderr. `jobs.wait()` throws
`JobFailedError` in this case.

Full table and both shapes in [references/errors.md](references/errors.md).

## Dependencies

`@rendobar/sdk` (npm) for JavaScript and TypeScript. Any other stack calls the
REST API directly using the OpenAPI spec, same endpoints and same shapes. No
local FFmpeg install is needed, the processing happens on Rendobar.
