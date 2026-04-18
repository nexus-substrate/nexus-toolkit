/**
 * Mock responses for nexus-toolkit tests.
 */

import type {
  OrchestrateResponse,
  CatalogReviewResponse,
  RegistryImportResponse,
  ListExpertsResponse,
} from '../types.js';

// ============================================================================
// orchestrate
// ============================================================================

export const MOCK_ORCHESTRATE_SUCCESS: OrchestrateResponse = {
  task: 'List programming languages used',
  status: 'completed',
  output: 'TypeScript is the primary language. Configuration uses YAML and JSON.',
  subtasks: [
    { task: 'Scan source files', status: 'completed', output: 'Found 825 .ts files' },
    { task: 'Check config formats', status: 'completed', output: 'YAML and JSON configs found' },
  ],
  iterations: 2,
  durationMs: 5200,
};

export const MOCK_ORCHESTRATE_TIMEOUT: OrchestrateResponse = {
  task: 'Complex analysis',
  status: 'timeout',
  error: 'Execution exceeded timeout of 15000ms',
  iterations: 1,
  durationMs: 15000,
};

export const MOCK_ORCHESTRATE_ERROR: OrchestrateResponse = {
  task: 'Failing task',
  status: 'error',
  error: 'Agent is not idle (current state: error)',
};

export const MOCK_ORCHESTRATE_FAILED: OrchestrateResponse = {
  task: 'Impossible task',
  status: 'failed',
  output: 'Could not complete — no suitable expert found',
  subtasks: [
    { task: 'Find expert', status: 'failed', error: 'No adapter configured' },
  ],
  iterations: 1,
  durationMs: 1200,
};

// ============================================================================
// research_catalog_review
// ============================================================================

export const MOCK_CATALOG_LIST_EMPTY: CatalogReviewResponse = {
  action: 'list',
  success: true,
  message: '0 pending references',
  data: { pending: [], count: 0 },
};

export const MOCK_CATALOG_LIST_WITH_ITEMS: CatalogReviewResponse = {
  action: 'list',
  success: true,
  message: '2 pending references',
  data: {
    pending: [
      { identifier: 'arxiv:2501.12345', title: 'Multi-Agent Routing', source: 'arxiv', discoveredAt: '2026-02-13' },
      { identifier: 'gh:user/repo', title: 'Agent Framework', source: 'github', discoveredAt: '2026-02-13' },
    ],
    count: 2,
  },
};

export const MOCK_CATALOG_APPROVE: CatalogReviewResponse = {
  action: 'approve',
  success: true,
  message: 'Approved reference: arxiv:2501.12345',
  data: { approved: 'arxiv:2501.12345' },
};

export const MOCK_CATALOG_DISMISS: CatalogReviewResponse = {
  action: 'dismiss',
  success: true,
  message: 'Dismissed reference: gh:user/repo',
  data: { dismissed: 'gh:user/repo' },
};

export const MOCK_CATALOG_FLUSH: CatalogReviewResponse = {
  action: 'flush',
  success: true,
  message: 'Flushed 5 references',
  data: { flushed: 5 },
};

// ============================================================================
// registry_import
// ============================================================================

export const MOCK_IMPORT_DRY_RUN: RegistryImportResponse = {
  dryRun: true,
  entry: {
    id: 'claude-opus-4-6',
    displayName: 'Claude Claude Opus 4 6',
    provider: 'anthropic',
    contextWindow: 200000,
    outputModalities: ['text', 'code'],
    inputModalities: ['text', 'code'],
    toolCapabilities: ['function_calling'],
    specialFeatures: [],
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    qualityScores: { reasoning: 5, codeGeneration: 5, speed: 5, cost: 5 },
    cliName: 'claude',
    cliModelName: 'claude-opus-4-6',
  },
  persisted: false,
  warnings: [
    'Quality scores set to 5/10 (unvalidated) — needs human review.',
    'Pricing set to 0 — update from anthropic pricing page.',
    'Context window defaulted to 200000 — verify from docs.',
  ],
};

export const MOCK_IMPORT_GOOGLE: RegistryImportResponse = {
  dryRun: true,
  entry: {
    id: 'gemini-2-0-flash',
    displayName: 'Google Gemini 2 0 Flash',
    provider: 'google',
    contextWindow: 200000,
    outputModalities: ['text', 'code'],
    inputModalities: ['text', 'code'],
    toolCapabilities: ['function_calling'],
    specialFeatures: [],
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    qualityScores: { reasoning: 5, codeGeneration: 5, speed: 5, cost: 5 },
    cliName: 'gemini',
    cliModelName: 'gemini-2.0-flash',
  },
  persisted: false,
  warnings: ['Quality scores set to 5/10 (unvalidated) — needs human review.'],
};

export const MOCK_IMPORT_OPENAI: RegistryImportResponse = {
  dryRun: true,
  entry: {
    id: 'codex-5-3',
    displayName: 'OpenAI Codex 5 3',
    provider: 'openai',
    contextWindow: 200000,
    outputModalities: ['text', 'code'],
    inputModalities: ['text', 'code'],
    toolCapabilities: ['function_calling'],
    specialFeatures: [],
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    qualityScores: { reasoning: 5, codeGeneration: 5, speed: 5, cost: 5 },
    cliName: 'codex',
    cliModelName: 'codex-5.3',
  },
  persisted: false,
  warnings: ['Quality scores set to 5/10 (unvalidated) — needs human review.'],
};

// ============================================================================
// list_experts
// ============================================================================

export const MOCK_LIST_EXPERTS_FULL: ListExpertsResponse = {
  experts: [
    {
      role: 'code_expert',
      name: 'Code Expert',
      description: 'Senior engineer specializing in production code quality and correctness.',
      capabilities: ['code_review', 'refactoring', 'debugging'],
    },
    {
      role: 'security_expert',
      name: 'Security Expert',
      description: 'Security engineer focused on threat modeling and secure design.',
      capabilities: ['threat_modeling', 'vulnerability_analysis', 'secure_coding'],
    },
    {
      role: 'testing_expert',
      name: 'Testing Expert',
      description: 'Test engineer focused on coverage, edge cases, and regression prevention.',
      capabilities: ['test_writing', 'coverage_analysis'],
    },
  ],
  count: 3,
};

export const MOCK_LIST_EXPERTS_NAMES: ListExpertsResponse = {
  experts: [
    { role: 'code_expert', name: 'Code Expert', description: 'Senior engineer.', capabilities: [] },
    {
      role: 'security_expert',
      name: 'Security Expert',
      description: 'Security engineer.',
      capabilities: [],
    },
    {
      role: 'testing_expert',
      name: 'Testing Expert',
      description: 'Test engineer.',
      capabilities: [],
    },
  ],
  count: 3,
};

export const MOCK_LIST_EXPERTS_EMPTY: ListExpertsResponse = {
  experts: [],
  count: 0,
};
