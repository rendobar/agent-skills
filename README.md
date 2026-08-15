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

The skill deliberately carries as few facts as possible. Job types, parameters,
and prices are fetched live from
[`GET /jobs/types`](https://api.rendobar.com/jobs/types), the per-type schema
endpoint, and [llms.txt](https://rendobar.com/llms.txt), so it cannot go stale
between releases. What it does carry is the part an agent cannot discover on its
own: that a `complete` status does not mean the output is correct, that a wait
timeout is not a failure, and that the API key belongs in an env file and never
in a chat window.

## Without an agent

The same guidance as a prompt you can paste into any assistant:

```
Add Rendobar to my app: read and follow https://rendobar.com/prompts/integrate.md
```

## Links

[Docs](https://rendobar.com/docs) · [Build with AI](https://rendobar.com/docs/build-with-ai) ·
[MCP](https://rendobar.com/mcp/) · [Dashboard](https://app.rendobar.com) ·
[Status of what is live](https://rendobar.com/llms.txt)

MIT licensed. Issues and PRs welcome.
