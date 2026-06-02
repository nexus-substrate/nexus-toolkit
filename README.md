# nexus-toolkit

E2E test suite for [nexus-agents](https://github.com/nexus-substrate/nexus-agents) MCP tools: **orchestrate**, **research_catalog_review**, and **registry_import**.

## What it tests

| Tool | Test | Safety |
|------|------|--------|
| `orchestrate` | Schema validation, adapter error handling | Skips gracefully when no model adapter configured |
| `research_catalog_review` | List/approve/dismiss/flush actions, schema validation | Read-only `list` action in audit pipeline |
| `registry_import` | All 3 providers (anthropic/google/openai), schema validation | Always `dryRun=true` — never persists |

The toolkit audit pipeline runs 5 tests: 1 orchestrate + 1 catalog review + 3 registry imports (one per provider).

## Quick start

```bash
pnpm install
pnpm test        # Run 47 unit tests
pnpm typecheck   # TypeScript strict mode
pnpm build       # Compile to dist/
```

## Usage as a library

```typescript
import { runToolkitAudit, generateReport } from 'nexus-toolkit';
import type { ToolCaller } from 'nexus-toolkit';

// Provide your own MCP tool caller
const caller: ToolCaller = {
  call: async (tool, args) => {
    // Send to your MCP server
    return await mcpClient.callTool(tool, args);
  },
};

const audit = await runToolkitAudit(caller);
console.log(generateReport(audit, 'markdown'));
// Output: Markdown table with pass/fail/skip per tool
```

## Live integration mode

Run against a real nexus-agents MCP server:

```bash
# 1. Create src/live-bridge.ts with your MCP client:
#    export async function createMcpCaller(): Promise<ToolCaller> { ... }

# 2. Run:
NEXUS_LIVE=true npx tsx src/run-live.ts

# 3. With JSON output:
NEXUS_LIVE=true REPORT_FORMAT=json npx tsx src/run-live.ts
```

## Report formats

```bash
# Markdown (default) — tables with summary + per-tool results
generateReport(audit, 'markdown')

# JSON — machine-readable audit object
generateReport(audit, 'json')

# Text — compact terminal output with PASS/FAIL/SKIP indicators
generateReport(audit, 'text')
```

## Project structure

```
src/
  types.ts              # Zod schemas matching live MCP responses
  fixtures/
    mock-responses.ts   # Mock data for all tool responses
  pipeline.ts           # Toolkit audit pipeline (testOrchestrate, testCatalogReview, testRegistryImport)
  reporter.ts           # Report formatter (markdown/json/text)
  live-caller.ts        # Live mode ToolCaller bridge
  run-live.ts           # CLI entry point for live integration testing
  index.ts              # Public API exports
```

## License

MIT
