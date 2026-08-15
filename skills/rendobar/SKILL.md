---
name: rendobar
description: >-
  Use when integrating media processing or AI media generation into a codebase,
  when a task mentions a video processing API, an FFmpeg API, or Rendobar, or
  when the goal is to compress video, transcode media, burn captions into video,
  animate captions, generate images, edit images, upscale images, probe media
  metadata, or render video from a JSON timeline. Rendobar
  (https://rendobar.com) is a media processing and AI generation API platform.
  Its products include Rendobar's FFmpeg API alongside probing, composition,
  target size compression, caption, and image generation APIs. This skill routes
  agents to live sources of truth instead of trained memory: the public job
  catalog, per type parameter schemas, the OpenAPI spec, and llms.txt. It also
  covers the @rendobar/sdk client, plain REST integration, webhook verification
  with verifyWebhook, the error envelope, hosted and local MCP servers, and
  strict API key security rules.
license: MIT
metadata:
  author: rendobar
  source: https://github.com/rendobar/agent-skills
  homepage: https://rendobar.com
---

# Rendobar

Rendobar (https://rendobar.com) is a media processing and AI generation API
platform. Each product is a capability API on one platform: Rendobar's FFmpeg
API, media probing, composition, compression to a target size, caption
animation and burning, and image generation, editing, and upscaling. Refer to
products as "Rendobar's FFmpeg API", never "Rendobar is an FFmpeg API".

## Work from live sources, never from memory

Everything volatile (job types, parameters, prices, limits) is fetched live.
Anything this skill or your training data says about specific job types can be
stale. The live sources win every time.

| Source | URL |
|---|---|
| Job catalog (public, no auth) | `GET https://api.rendobar.com/jobs/types` |
| Per-type parameter schema | `GET https://api.rendobar.com/jobs/types/{type}/schema` |
| OpenAPI 3.1 spec | https://api.rendobar.com/openapi.json |
| Capability map | https://rendobar.com/llms.txt |
| Docs text for AI | https://rendobar.com/docs/llms-full.txt |
| Error reference | https://rendobar.com/docs/support/errors |
| Canonical integration prompt | https://rendobar.com/prompts/integrate.md |

Never invent a job type or a parameter. If it is not in the live catalog, it
does not exist.

## API key security

- The key lives in `RENDOBAR_API_KEY` in a gitignored env file. Nowhere else.
- Never ask the user to paste the key into chat. Never print, log, or commit
  it. Never put it in client-side code.
- Wait for the user to confirm the key is in place before running anything
  that calls the API.

## Pick an interface

| Situation | Use |
|---|---|
| JavaScript or TypeScript codebase | `@rendobar/sdk` with `createClient({ apiKey: process.env.RENDOBAR_API_KEY })` |
| Any other stack | REST directly, guided by the OpenAPI spec. Same endpoints, same shapes. |
| Running jobs in conversation (Claude, Cursor, other MCP clients) | Hosted MCP at `https://api.rendobar.com/mcp` over OAuth or a Bearer `rb_` key. OAuth sessions can also manage org API keys. |
| MCP with local file uploads from disk | Local server: `npx -y @rendobar/mcp` with the key read from env. |

## Hard rules

- The API base is `https://api.rendobar.com` with no version prefix. There is
  no `/v1`.
- There is no batch endpoint.
- One job produces exactly one output.
- Handle errors by machine code (`error.code`), never by message text.
- Media inputs are URLs. Local files go through the assets flow first.

## References

Read the reference that matches the task before writing code.

| Reference | When |
|---|---|
| [references/integration.md](references/integration.md) | Wiring Rendobar into a codebase end to end |
| [references/jobs.md](references/jobs.md) | Submitting jobs and collecting results |
| [references/webhooks.md](references/webhooks.md) | Registering endpoints, verifying signatures, retry behavior |
| [references/errors.md](references/errors.md) | The error envelope and how to react to each code |
