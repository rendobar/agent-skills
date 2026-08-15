# Errors: the envelope and how to react

## The envelope

Every error response has exactly this shape:

```json
{ "error": { "code": "INSUFFICIENT_CREDITS", "message": "Not enough credits for this job" } }
```

Branch on `error.code`, never on message text. Messages are for humans and can
change. Codes are the contract.

The live error reference at https://rendobar.com/docs/support/errors is
canonical and always current. The table below covers the codes an integration
must handle.

## Key codes

| Code | HTTP | React |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The request body or params failed schema validation. Fix the payload. Re-read the type's schema at `GET /jobs/types/{type}/schema`. Do not retry unchanged. |
| `INVALID_JOB_TYPE` | 400 | The type does not exist. Re-read the live catalog at `GET /jobs/types`. Never guess type names. |
| `UNAUTHORIZED` | 401 | Missing or invalid API key. Usually the key is not reaching the process env. Check the env file and how the process loads it. |
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
- The envelope above is for request errors. A job that fails during
  processing returns 200 on `GET /jobs/{id}` with status `failed` and a
  human-readable `error` string on the job resource itself.
