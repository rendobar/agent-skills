# Rendobar agent skills

Give your coding agent Rendobar's [media processing and AI generation API](https://rendobar.com):
FFmpeg jobs, compression to a target size, captions, composition from a JSON
timeline, and image generation, editing, and upscaling.

## Install

```bash
npx skills add rendobar/agent-skills
```

Works with Claude Code, Cursor, Codex, and every other agent that reads the
[Agent Skills](https://agentskills.io) format.

As a Claude Code plugin instead:

```
/plugin marketplace add rendobar/agent-skills
```

That also registers Rendobar's hosted MCP server, so the agent can run jobs in
the conversation rather than only write code that calls the API.

## What is in it

| Path | What |
|---|---|
| `skills/rendobar/SKILL.md` | The router: quick start, verification rules, common mistakes, error triage |
| `skills/rendobar/references/integration.md` | Wiring Rendobar into a codebase end to end |
| `skills/rendobar/references/jobs.md` | Submitting jobs and collecting results |
| `skills/rendobar/references/webhooks.md` | Endpoints, signature verification, retry behavior |
| `skills/rendobar/references/errors.md` | The error envelope and how to react to each code |
| `skills/rendobar/scripts/preflight.mjs` | Run before writing code: checks the key, the balance, and the live job catalog |
| `skill-evals/rendobar/evals.json` | The scenarios this skill has to pass |

## Design

The skill deliberately carries as few facts as possible. Job types and their
parameters are read live from
[`GET /jobs/types`](https://api.rendobar.com/jobs/types) and the per-type schema
endpoint, so the skill cannot go stale between releases. What it does carry is
the part an agent cannot discover on its own: that a `complete` status does not
mean the output is correct, that a wait timeout is not a failure, and that the
API key belongs in an env file and never in a chat window.

## What it does at runtime

The skill reads two first-party Rendobar endpoints, both of which return JSON
data rather than instructions:

- `GET https://api.rendobar.com/jobs/types` and the per-type schema endpoint
- `https://api.rendobar.com/openapi.json`

It fetches no instructions to follow, sends no telemetry, and contacts no other
host. `scripts/preflight.mjs` additionally calls `/orgs/current` and
`/billing/state` with your own key, to check that the key works and that the
account has credit. Your key is read from `RENDOBAR_API_KEY` in the environment
and is never printed or transmitted anywhere except to Rendobar.

## Not using skills?

The same guidance is published as a prompt you can paste into any assistant.
See [Build with AI](https://rendobar.com/docs/build-with-ai) for it. That is a
separate distribution channel for people without a skills-capable agent. This
skill does not fetch or defer to it.

## Links

[Docs](https://rendobar.com/docs) · [Build with AI](https://rendobar.com/docs/build-with-ai) ·
[MCP](https://rendobar.com/mcp/) · [Dashboard](https://app.rendobar.com) ·
[Status of what is live](https://rendobar.com/llms.txt)

MIT licensed. Issues and PRs welcome.
