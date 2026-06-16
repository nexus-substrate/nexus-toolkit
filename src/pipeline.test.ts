/**
 * Tests for the toolkit audit pipeline.
 */

import { describe, it, expect, vi } from 'vitest';
import type { ToolCaller } from './types.js';
import {
  testOrchestrate,
  testCatalogReview,
  testRegistryImport,
  runToolkitAudit,
} from './pipeline.js';
import {
  MOCK_ORCHESTRATE_SUCCESS,
  MOCK_ORCHESTRATE_ERROR,
  MOCK_CATALOG_LIST_EMPTY,
  MOCK_CATALOG_LIST_WITH_ITEMS,
  MOCK_IMPORT_DRY_RUN,
  MOCK_IMPORT_GOOGLE,
  MOCK_IMPORT_OPENAI,
} from './fixtures/mock-responses.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function mockCaller(
  responses: Record<string, unknown>,
): ToolCaller & { calls: Array<{ tool: string; args: Record<string, unknown> }> } {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    call: vi.fn(async (tool: string, args: Record<string, unknown>) => {
      calls.push({ tool, args });
      const response = responses[tool];
      if (response === undefined) throw new Error(`Unexpected tool: ${tool}`);
      return response;
    }),
  };
}

// ---------------------------------------------------------------------------
// testOrchestrate
// ---------------------------------------------------------------------------

describe('testOrchestrate', () => {
  it('returns pass on successful orchestration', async () => {
    const caller = mockCaller({ orchestrate: MOCK_ORCHESTRATE_SUCCESS });
    const result = await testOrchestrate(caller, 'Test task');
    expect(result.status).toBe('pass');
    expect(result.tool).toBe('orchestrate');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns skip when adapter not configured', async () => {
    const caller: ToolCaller = {
      call: async () => { throw new Error('Agent is not idle (current state: error)'); },
    };
    const result = await testOrchestrate(caller, 'Test');
    expect(result.status).toBe('skip');
    expect(result.error).toContain('not idle');
  });

  it('returns fail on schema mismatch', async () => {
    const caller = mockCaller({ orchestrate: { invalid: true } });
    const result = await testOrchestrate(caller, 'Test');
    expect(result.status).toBe('fail');
    expect(result.error).toContain('Schema');
  });

  it('returns fail on unexpected error', async () => {
    const caller: ToolCaller = {
      call: async () => { throw new Error('Network timeout'); },
    };
    const result = await testOrchestrate(caller, 'Test');
    expect(result.status).toBe('fail');
    expect(result.error).toBe('Network timeout');
  });

  it('returns fail (not skip) for genuine errors whose message contains "failed"', async () => {
    const caller: ToolCaller = {
      call: async () => { throw new Error('orchestration failed: adapter timeout'); },
    };
    const result = await testOrchestrate(caller, 'Test');
    expect(result.status).toBe('fail');
    expect(result.error).toBe('orchestration failed: adapter timeout');
  });

  it('returns skip when no adapter is available', async () => {
    const caller: ToolCaller = {
      call: async () => { throw new Error('no model adapter available'); },
    };
    const result = await testOrchestrate(caller, 'Test');
    expect(result.status).toBe('skip');
    expect(result.error).toContain('no model adapter');
  });
});

// ---------------------------------------------------------------------------
// testCatalogReview
// ---------------------------------------------------------------------------

describe('testCatalogReview', () => {
  it('returns pass on successful list', async () => {
    const caller = mockCaller({ research_catalog_review: MOCK_CATALOG_LIST_EMPTY });
    const result = await testCatalogReview(caller, 'list');
    expect(result.status).toBe('pass');
  });

  it('returns pass with items', async () => {
    const caller = mockCaller({ research_catalog_review: MOCK_CATALOG_LIST_WITH_ITEMS });
    const result = await testCatalogReview(caller, 'list');
    expect(result.status).toBe('pass');
  });

  it('returns fail on error', async () => {
    const caller: ToolCaller = {
      call: async () => { throw new Error('Internal error'); },
    };
    const result = await testCatalogReview(caller, 'list');
    expect(result.status).toBe('fail');
  });

  it('passes action argument correctly', async () => {
    const caller = mockCaller({ research_catalog_review: MOCK_CATALOG_LIST_EMPTY });
    await testCatalogReview(caller, 'list');
    expect(caller.calls[0]?.args['action']).toBe('list');
  });
});

// ---------------------------------------------------------------------------
// testRegistryImport
// ---------------------------------------------------------------------------

describe('testRegistryImport', () => {
  it('returns pass for anthropic dry run', async () => {
    const caller = mockCaller({ registry_import: MOCK_IMPORT_DRY_RUN });
    const result = await testRegistryImport(caller, 'anthropic', 'claude-opus-4-6');
    expect(result.status).toBe('pass');
  });

  it('returns pass for google', async () => {
    const caller = mockCaller({ registry_import: MOCK_IMPORT_GOOGLE });
    const result = await testRegistryImport(caller, 'google', 'gemini-2.0-flash');
    expect(result.status).toBe('pass');
  });

  it('returns pass for openai', async () => {
    const caller = mockCaller({ registry_import: MOCK_IMPORT_OPENAI });
    const result = await testRegistryImport(caller, 'openai', 'codex-5.3');
    expect(result.status).toBe('pass');
  });

  it('always uses dryRun=true', async () => {
    const caller = mockCaller({ registry_import: MOCK_IMPORT_DRY_RUN });
    await testRegistryImport(caller, 'anthropic', 'test');
    expect(caller.calls[0]?.args['dryRun']).toBe(true);
  });

  it('fails when dryRun is false in response', async () => {
    const caller = mockCaller({ registry_import: { ...MOCK_IMPORT_DRY_RUN, dryRun: false } });
    const result = await testRegistryImport(caller, 'anthropic', 'test');
    expect(result.status).toBe('fail');
    expect(result.error).toContain('dryRun=true');
  });
});

// ---------------------------------------------------------------------------
// runToolkitAudit
// ---------------------------------------------------------------------------

describe('runToolkitAudit', () => {
  it('runs all 5 tests (1 orchestrate + 1 catalog + 3 import)', async () => {
    let importCallCount = 0;
    const importMocks = [MOCK_IMPORT_DRY_RUN, MOCK_IMPORT_GOOGLE, MOCK_IMPORT_OPENAI];
    const caller: ToolCaller = {
      call: async (tool: string) => {
        if (tool === 'orchestrate') return MOCK_ORCHESTRATE_SUCCESS;
        if (tool === 'research_catalog_review') return MOCK_CATALOG_LIST_EMPTY;
        if (tool === 'registry_import') return importMocks[importCallCount++];
        throw new Error(`Unexpected: ${tool}`);
      },
    };

    const audit = await runToolkitAudit(caller);
    expect(audit.results).toHaveLength(5);
    expect(audit.passed).toBe(5);
    expect(audit.failed).toBe(0);
    expect(audit.skipped).toBe(0);
  });

  it('handles orchestrate skip gracefully', async () => {
    let importCallCount = 0;
    const importMocks = [MOCK_IMPORT_DRY_RUN, MOCK_IMPORT_GOOGLE, MOCK_IMPORT_OPENAI];
    const caller: ToolCaller = {
      call: async (tool: string) => {
        if (tool === 'orchestrate') throw new Error('Agent is not idle (current state: error)');
        if (tool === 'research_catalog_review') return MOCK_CATALOG_LIST_EMPTY;
        if (tool === 'registry_import') return importMocks[importCallCount++];
        throw new Error(`Unexpected: ${tool}`);
      },
    };

    const audit = await runToolkitAudit(caller);
    expect(audit.passed).toBe(4);
    expect(audit.skipped).toBe(1);
    expect(audit.failed).toBe(0);
  });

  it('reports correct tool names', async () => {
    const caller: ToolCaller = {
      call: async (tool: string) => {
        if (tool === 'orchestrate') return MOCK_ORCHESTRATE_SUCCESS;
        if (tool === 'research_catalog_review') return MOCK_CATALOG_LIST_EMPTY;
        if (tool === 'registry_import') return MOCK_IMPORT_DRY_RUN;
        throw new Error(`Unexpected: ${tool}`);
      },
    };

    const audit = await runToolkitAudit(caller);
    const tools = audit.results.map((r) => r.tool);
    expect(tools).toContain('orchestrate');
    expect(tools).toContain('research_catalog_review');
    expect(tools.filter((t) => t === 'registry_import')).toHaveLength(3);
  });
});
