# Rendobar agent skills

Agent skills for integrating [Rendobar](https://rendobar.com), the media
processing and AI generation API platform, from any coding agent. The skill
teaches an agent to work from Rendobar's live sources of truth (job catalog,
parameter schemas, OpenAPI spec), to handle API keys safely, and to pick the
right interface: the `@rendobar/sdk` client, plain REST, or an MCP server.

## Install

With the [skills](https://skills.sh) CLI:

```bash
npx skills add rendobar/agent-skills
```

As a Claude Code plugin:

```
/plugin marketplace add rendobar/agent-skills
/plugin install rendobar@rendobar-skills
```

## What is inside

```
skills/rendobar/
├── SKILL.md                    # The router: live sources, key rules, interface choice
└── references/
    ├── integration.md          # End to end codebase integration
    ├── jobs.md                 # Submit, wait, and collect results
    ├── webhooks.md             # Register, verify signatures, retry semantics
    └── errors.md               # Error envelope and reaction table
```

## The one rule that matters

Job types and parameters are never hardcoded in these docs. Agents fetch them
live from `GET https://api.rendobar.com/jobs/types` and
`GET https://api.rendobar.com/jobs/types/{type}/schema`, so the skill cannot
drift from the platform.

## Links

- Platform: https://rendobar.com
- Docs: https://rendobar.com/docs
- Dashboard: https://app.rendobar.com
- SDK: `@rendobar/sdk` on npm

## License

MIT
