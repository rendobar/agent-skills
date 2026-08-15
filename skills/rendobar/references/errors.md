# Errors: the envelope and how to react

There are two different error shapes, and confusing them is the usual bug.

## 1. Request errors (the call itself failed)

Any non-2xx response has exactly this shape:

```json
{ "error": { "code": "INSUFFICIENT_CREDITS", "message": "Not enough credits for this job" } }
```

`VALIDATION_ERROR` adds a `details` array naming the exact bad path, which is
the fastest way to fix a malformed body:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid job parameters: ...",
  "details": [ { "path": ["command"], "message": "Invalid input: expected string, received undefined" } ] } }
```

The SDK raises these as `ApiError` with `.code` and `.statusCode`. It throws,
it does not return an error object.

## 2. Job failures (the call succeeded, the work did not)

A job that fails during processing is **not** a request error. `GET /jobs/{id}`
returns 200 with `status: "failed"` and a structured `error` object on the job,
present only in that state:

```json
{ "status": "failed", "error": {
    "code": "INPUT_FETCH_FAILED",
    "message": "could not fetch input for probing: Failed to download input \"in0\" from https://... : 404 Not Found",
    "detail": null,
    "retryable": false,
    "failedPhase": "processing" } }
```

`error` is an object, never a bare string. Read these fields:

- **`retryable`** decides your next move. Do not invent your own retry policy
  when the API already told you the answer.
- **`failedPhase`** is `preparing`, `processing`, or `finalizing`. A
  `preparing` failure is usually a bad input or an unreachable URL, so fix the
  input rather than retrying.
- **`detail`** carries the real provider stderr tail (ffmpeg, for example) when
  there is one, and is null otherwise. It is where the actual cause lives.

The SDK's `jobs.wait()` throws `JobFailedError` for this case rather than
returning the failed job, so catch it if you want to inspect the fields.

Job failure codes are their own set and are not limited to the request codes
below. `INPUT_FETCH_FAILED` (a source URL that did not download) is the one you
will see most. Read `error.code` and `error.message` rather than assuming.

Branch on `code`, never on message text. Messages are for humans and can
change. Codes are the contract.

The live error reference at https://rendobar.com/docs/support/errors is
canonical and always current. The table below covers the codes an integration
must handle.

## Key codes

| Code | HTTP | React |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The request body or params failed schema validation. Fix the payload. Re-read the type's schema at `GET /jobs/types/{type}/schema`. Do not retry unchanged. |
| `INVALID_JOB_TYPE` | 400 | The type does not exist. Re-read the live catalog at `GET /jobs/types`. Never guess type names. |
| `UNAUTHORIZED` | 401 | Two distinct causes, check both before reporting: the key may not be reaching the process env, or the key itself may be invalid for this API (revoked, mistyped, or issued for another environment such as staging). Confirm which one rather than guessing. |
| `INSUFFICIENT_CREDITS` | 402 | The org balance cannot cover the job. Tell the user to top up at https://app.rendobar.com/billing. Do not retry until they do. |
| `FORBIDDEN` | 403 | The key's org cannot access this resource. |
| `PLAN_LIMIT` | 403 | A plan limit was hit (file size, concurrency, and similar). Surface it to the user, do not silently retry. |
| `NOT_FOUND` | 404 | The resource does not exist or belongs to another org. Check the id. |
| `CONFLICT` | 409 | State conflict, for example cancelling a job that already finished. |
| `RATE_LIMITED` | 429 | Too many requests. Retry with exponential backoff and jitter. |
| `RUNNER_ERROR` | 502 | The processing backend failed. Safe to retry the job (use an `idempotencyKey`). |
| `RUNNER_TIMEOUT` | 504 | The job exceeded its timeout. Retrying the same input usually times out again, so reconsider the input or params. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. Retry with backoff, then surface. |

## Rules of thumb

- Retryable with backoff: `RATE_LIMITED`, `RUNNER_ERROR`, `INTERNAL_ERROR`.
- Fix-then-retry: `VALIDATION_ERROR`, `INVALID_JOB_TYPE`, `UNAUTHORIZED`.
- User action required: `INSUFFICIENT_CREDITS`, `PLAN_LIMIT`.
- For a failed job, do not apply these rules of thumb at all. Read
  `error.retryable` on the job, which is authoritative for that specific
  failure.
