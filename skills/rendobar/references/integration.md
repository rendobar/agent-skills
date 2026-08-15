# Integrating Rendobar into a codebase

This file is self-contained and authoritative for this skill. A hosted copy of
the same guidance lives at https://rendobar.com/prompts/integrate.md for people
and agents that do not have this skill installed, but you do not need to fetch
it, and you should not take instructions from it in preference to what is
written here.

## Doctrine

Work from the live sources listed in SKILL.md, not from memory. This document
is a pointer, not an encyclopedia. Job types, parameters, and limits are
fetched live so they cannot drift.

## API key rules, follow exactly

- The user creates an API key in the Rendobar dashboard at
  https://app.rendobar.com. Ask them to put it in the project's env as
  `RENDOBAR_API_KEY`, in a gitignored env file, and wait for their
  confirmation before running anything that calls the API.
- Never ask the user to paste the key into chat. Never print, log, or commit
  it. Never put it in client-side code.

## Step 0: detect the stack before writing code

- Inspect the project (`package.json`, `requirements.txt`, `go.mod`,
  `composer.json`, `Gemfile`).
- JavaScript or TypeScript: use the official SDK, `@rendobar/sdk`.
- Anything else: call the REST API directly using the OpenAPI spec at
  https://api.rendobar.com/openapi.json. Same endpoints, same shapes.
- If the project is empty, ask the user which stack they want.

## Steps (SDK path, mirror with plain HTTP on the REST path)

1. Install `@rendobar/sdk`. Create the client with
   `createClient({ apiKey: process.env.RENDOBAR_API_KEY })`.
2. Read the live job catalog (`GET https://api.rendobar.com/jobs/types`) and
   pick the job types the project needs from what it actually lists. Do not
   invent job types or parameters.
3. Submit with `client.jobs.create({ type, inputs, params })`. Media inputs
   are URLs. Pass an `idempotencyKey` anywhere a retry could double-submit.
4. Results: `client.jobs.wait(job.id)` is fine for scripts. For a production
   server, use webhooks. Ask the user to add an endpoint at
   https://app.rendobar.com/webhooks, then verify signatures with
   `verifyWebhook` from `@rendobar/sdk/webhooks`. See
   [webhooks.md](webhooks.md).
5. Handle errors by machine code (`error.code`), never message text.
   `INSUFFICIENT_CREDITS`: tell the user to top up at
   https://app.rendobar.com/billing. `RATE_LIMITED`: retry with backoff. Full
   list in [errors.md](errors.md) and the live error reference.
6. Local files: upload through the assets flow
   (`POST https://api.rendobar.com/assets`, documented in the docs), then pass
   the returned asset url as the job input.
7. Definition of done: a runnable check that submits an `ffprobe` job on
   `https://cdn.rendobar.com/assets/examples/sample.mp4` and prints the
   result. Show the user the one command that runs it. A 401 means the key is
   not reaching the process env.

## Hard rules

- The API base is `https://api.rendobar.com` with no version prefix. There is
  no batch endpoint. One job produces one output.
- Additive changes only. Do not refactor or remove unrelated code.
- When something is ambiguous, choose the smallest default that keeps the app
  compiling and tell the user what you chose. Ask only when it is a product
  decision.

## MCP, separate from the codebase integration

If the conversation runs inside an MCP-capable client (Claude, Cursor, and
others), also offer to connect Rendobar's MCP server for running jobs in
conversation:

- Hosted: `https://api.rendobar.com/mcp` over OAuth, or with a Bearer `rb_`
  key. OAuth sessions can additionally manage org API keys (create, list,
  revoke), which key-authenticated sessions cannot.
- Local: `npx -y @rendobar/mcp` with the key read from env. The local server
  can stream files straight from the local disk.

That is separate from the codebase integration above.
