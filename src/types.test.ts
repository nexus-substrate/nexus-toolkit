/**
 * Tests for Zod schema validation — orchestrate, catalog_review, registry_import.
 */

import { describe, it, expect } from 'vitest';
import {
  OrchestrateInputSchema,
  OrchestrateResponseSchema,
  CatalogReviewInputSchema,
  CatalogReviewResponseSchema,
  RegistryImportInputSchema,
  RegistryImportResponseSchema,
  ListExpertsInputSchema,
  ListExpertsResponseSchema,
} from './types.js';
import {
  MOCK_ORCHESTRATE_SUCCESS,
  MOCK_ORCHESTRATE_TIMEOUT,
  MOCK_ORCHESTRATE_ERROR,
  MOCK_ORCHESTRATE_FAILED,
  MOCK_CATALOG_LIST_EMPTY,
  MOCK_CATALOG_LIST_WITH_ITEMS,
  MOCK_CATALOG_APPROVE,
  MOCK_CATALOG_DISMISS,
  MOCK_CATALOG_FLUSH,
  MOCK_IMPORT_DRY_RUN,
  MOCK_IMPORT_GOOGLE,
  MOCK_IMPORT_OPENAI,
  MOCK_LIST_EXPERTS_FULL,
  MOCK_LIST_EXPERTS_NAMES,
  MOCK_LIST_EXPERTS_EMPTY,
} from './fixtures/mock-responses.js';

// ============================================================================
// orchestrate
// ============================================================================

describe('OrchestrateInputSchema', () => {
  it('accepts minimal input', () => {
    expect(OrchestrateInputSchema.safeParse({ task: 'Test' }).success).toBe(true);
  });

  it('accepts full input', () => {
    const r = OrchestrateInputSchema.safeParse({
      task: 'Complex task',
      context: { key: 'value' },
      maxIterations: 10,
      timeout: 30000,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty task', () => {
    expect(OrchestrateInputSchema.safeParse({ task: '' }).success).toBe(false);
  });

  it('rejects maxIterations over 50', () => {
    expect(OrchestrateInputSchema.safeParse({ task: 'x', maxIterations: 51 }).success).toBe(false);
  });

  it('rejects timeout over 600000', () => {
    expect(OrchestrateInputSchema.safeParse({ task: 'x', timeout: 700000 }).success).toBe(false);
  });
});

describe('OrchestrateResponseSchema', () => {
  it('parses success response', () => {
    const r = OrchestrateResponseSchema.safeParse(MOCK_ORCHESTRATE_SUCCESS);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe('completed');
      expect(r.data.subtasks).toHaveLength(2);
    }
  });

  it('parses timeout response', () => {
    const r = OrchestrateResponseSchema.safeParse(MOCK_ORCHESTRATE_TIMEOUT);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('timeout');
  });

  it('parses error response', () => {
    const r = OrchestrateResponseSchema.safeParse(MOCK_ORCHESTRATE_ERROR);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.error).toContain('not idle');
  });

  it('parses failed response', () => {
    const r = OrchestrateResponseSchema.safeParse(MOCK_ORCHESTRATE_FAILED);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('failed');
  });
});

// ============================================================================
// research_catalog_review
// ============================================================================

describe('CatalogReviewInputSchema', () => {
  it('accepts all actions', () => {
    for (const action of ['list', 'approve', 'dismiss', 'flush']) {
      expect(CatalogReviewInputSchema.safeParse({ action }).success).toBe(true);
    }
  });

  it('rejects invalid action', () => {
    expect(CatalogReviewInputSchema.safeParse({ action: 'invalid' }).success).toBe(false);
  });

  it('accepts with optional fields', () => {
    const r = CatalogReviewInputSchema.safeParse({
      action: 'approve',
      identifier: 'arxiv:2501.12345',
      topic: 'routing',
      createIssue: true,
    });
    expect(r.success).toBe(true);
  });
});

describe('CatalogReviewResponseSchema', () => {
  it('parses empty list', () => {
    const r = CatalogReviewResponseSchema.safeParse(MOCK_CATALOG_LIST_EMPTY);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.data?.count).toBe(0);
    }
  });

  it('parses list with items', () => {
    const r = CatalogReviewResponseSchema.safeParse(MOCK_CATALOG_LIST_WITH_ITEMS);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.data?.pending).toHaveLength(2);
      expect(r.data.data?.count).toBe(2);
    }
  });

  it('parses approve response', () => {
    const r = CatalogReviewResponseSchema.safeParse(MOCK_CATALOG_APPROVE);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data?.approved).toBe('arxiv:2501.12345');
  });

  it('parses dismiss response', () => {
    const r = CatalogReviewResponseSchema.safeParse(MOCK_CATALOG_DISMISS);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data?.dismissed).toBe('gh:user/repo');
  });

  it('parses flush response', () => {
    const r = CatalogReviewResponseSchema.safeParse(MOCK_CATALOG_FLUSH);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data?.flushed).toBe(5);
  });
});

// ============================================================================
// registry_import
// ============================================================================

describe('RegistryImportInputSchema', () => {
  it('accepts all providers', () => {
    for (const provider of ['anthropic', 'google', 'openai']) {
      const r = RegistryImportInputSchema.safeParse({ provider, modelId: 'test-model' });
      expect(r.success).toBe(true);
    }
  });

  it('rejects invalid provider', () => {
    expect(RegistryImportInputSchema.safeParse({ provider: 'invalid', modelId: 'x' }).success).toBe(false);
  });

  it('rejects empty modelId', () => {
    expect(RegistryImportInputSchema.safeParse({ provider: 'anthropic', modelId: '' }).success).toBe(false);
  });
});

describe('RegistryImportResponseSchema', () => {
  it('parses anthropic dry run', () => {
    const r = RegistryImportResponseSchema.safeParse(MOCK_IMPORT_DRY_RUN);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.dryRun).toBe(true);
      expect(r.data.persisted).toBe(false);
      expect(r.data.entry.provider).toBe('anthropic');
      expect(r.data.entry.cliName).toBe('claude');
      expect(r.data.warnings.length).toBeGreaterThan(0);
    }
  });

  it('parses google import', () => {
    const r = RegistryImportResponseSchema.safeParse(MOCK_IMPORT_GOOGLE);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.entry.provider).toBe('google');
      expect(r.data.entry.cliName).toBe('gemini');
    }
  });

  it('parses openai import', () => {
    const r = RegistryImportResponseSchema.safeParse(MOCK_IMPORT_OPENAI);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.entry.provider).toBe('openai');
      expect(r.data.entry.cliName).toBe('codex');
    }
  });

  it('validates quality scores', () => {
    const r = RegistryImportResponseSchema.safeParse(MOCK_IMPORT_DRY_RUN);
    expect(r.success).toBe(true);
    if (r.success) {
      const scores = r.data.entry.qualityScores;
      expect(scores.reasoning).toBe(5);
      expect(scores.codeGeneration).toBe(5);
      expect(scores.speed).toBe(5);
      expect(scores.cost).toBe(5);
    }
  });

  it('maps provider to correct CLI name', () => {
    const cases = [
      { mock: MOCK_IMPORT_DRY_RUN, cli: 'claude' },
      { mock: MOCK_IMPORT_GOOGLE, cli: 'gemini' },
      { mock: MOCK_IMPORT_OPENAI, cli: 'codex' },
    ];
    for (const { mock, cli } of cases) {
      const r = RegistryImportResponseSchema.safeParse(mock);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.entry.cliName).toBe(cli);
    }
  });
});

// ============================================================================
// list_experts
// ============================================================================

describe('ListExpertsInputSchema', () => {
  it('accepts empty input', () => {
    expect(ListExpertsInputSchema.safeParse({}).success).toBe(true);
  });

  it('accepts format=full', () => {
    expect(ListExpertsInputSchema.safeParse({ format: 'full' }).success).toBe(true);
  });

  it('accepts format=names', () => {
    expect(ListExpertsInputSchema.safeParse({ format: 'names' }).success).toBe(true);
  });

  it('rejects invalid format value', () => {
    expect(ListExpertsInputSchema.safeParse({ format: 'verbose' }).success).toBe(false);
  });

  it('rejects non-string format', () => {
    expect(ListExpertsInputSchema.safeParse({ format: 42 }).success).toBe(false);
  });
});

describe('ListExpertsResponseSchema', () => {
  it('parses full response with capabilities', () => {
    const r = ListExpertsResponseSchema.safeParse(MOCK_LIST_EXPERTS_FULL);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(3);
      expect(r.data.experts).toHaveLength(3);
      expect(r.data.experts[0]?.capabilities.length).toBeGreaterThan(0);
    }
  });

  it('parses names-format response with empty capabilities', () => {
    const r = ListExpertsResponseSchema.safeParse(MOCK_LIST_EXPERTS_NAMES);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(3);
      expect(r.data.experts[0]?.capabilities).toHaveLength(0);
    }
  });

  it('parses empty response', () => {
    const r = ListExpertsResponseSchema.safeParse(MOCK_LIST_EXPERTS_EMPTY);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(0);
      expect(r.data.experts).toHaveLength(0);
    }
  });

  it('validates expert info fields', () => {
    const r = ListExpertsResponseSchema.safeParse(MOCK_LIST_EXPERTS_FULL);
    expect(r.success).toBe(true);
    if (r.success) {
      const expert = r.data.experts[0];
      expect(expert).toBeDefined();
      if (expert) {
        expect(expert.role).toBe('code_expert');
        expect(expert.name).toBe('Code Expert');
        expect(expert.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects response missing count', () => {
    expect(
      ListExpertsResponseSchema.safeParse({ experts: [] }).success
    ).toBe(false);
  });

  it('rejects expert missing role field', () => {
    const bad = {
      experts: [{ name: 'X', description: 'd', capabilities: [] }],
      count: 1,
    };
    expect(ListExpertsResponseSchema.safeParse(bad).success).toBe(false);
  });
});
