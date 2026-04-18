/**
 * Zod schemas for remaining MCP tool contracts.
 *
 * Covers: orchestrate, research_catalog_review, registry_import
 * Schemas match LIVE tool responses from nexus-agents MCP server.
 */

import { z } from 'zod';

// ============================================================================
// orchestrate
// ============================================================================

export const OrchestrateInputSchema = z.object({
  task: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  maxIterations: z.number().min(1).max(50).optional(),
  timeout: z.number().min(1000).max(600000).optional(),
});

const SubtaskResultSchema = z.object({
  task: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  output: z.string().optional(),
  error: z.string().optional(),
});

export const OrchestrateResponseSchema = z.object({
  task: z.string(),
  status: z.enum(['completed', 'failed', 'timeout', 'error']),
  output: z.string().optional(),
  subtasks: z.array(SubtaskResultSchema).optional(),
  iterations: z.number().optional(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
});

export type OrchestrateResponse = z.infer<typeof OrchestrateResponseSchema>;

// Error response for when orchestrate fails (adapter not configured)
export const OrchestrateErrorSchema = z.object({
  error: z.string(),
});

// ============================================================================
// research_catalog_review
// ============================================================================

export const CatalogReviewInputSchema = z.object({
  action: z.enum(['list', 'approve', 'dismiss', 'flush']),
  identifier: z.string().optional(),
  topic: z.string().optional(),
  createIssue: z.boolean().optional(),
});

const CatalogReferenceSchema = z.object({
  identifier: z.string(),
  title: z.string().optional(),
  source: z.string().optional(),
  discoveredAt: z.string().optional(),
});

export const CatalogReviewResponseSchema = z.object({
  action: z.string(),
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    pending: z.array(CatalogReferenceSchema).optional(),
    count: z.number().optional(),
    approved: z.string().optional(),
    dismissed: z.string().optional(),
    flushed: z.number().optional(),
  }).optional(),
});

export type CatalogReviewResponse = z.infer<typeof CatalogReviewResponseSchema>;

// ============================================================================
// registry_import
// ============================================================================

export const RegistryImportInputSchema = z.object({
  provider: z.enum(['anthropic', 'google', 'openai']),
  modelId: z.string().min(1),
  dryRun: z.boolean().optional(),
});

const QualityScoresSchema = z.object({
  reasoning: z.number(),
  codeGeneration: z.number(),
  speed: z.number(),
  cost: z.number(),
});

const PricingSchema = z.object({
  inputPer1M: z.number(),
  outputPer1M: z.number(),
});

const ModelEntrySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  provider: z.string(),
  contextWindow: z.number(),
  outputModalities: z.array(z.string()),
  inputModalities: z.array(z.string()),
  toolCapabilities: z.array(z.string()),
  specialFeatures: z.array(z.string()),
  pricing: PricingSchema,
  qualityScores: QualityScoresSchema,
  cliName: z.string(),
  cliModelName: z.string(),
});

export const RegistryImportResponseSchema = z.object({
  dryRun: z.boolean(),
  entry: ModelEntrySchema,
  persisted: z.boolean(),
  warnings: z.array(z.string()),
});

export type RegistryImportResponse = z.infer<typeof RegistryImportResponseSchema>;
export type ModelEntry = z.infer<typeof ModelEntrySchema>;

// ============================================================================
// list_experts
// ============================================================================

export const ListExpertsInputSchema = z.object({
  format: z.enum(['full', 'names']).optional(),
});

export type ListExpertsInput = z.infer<typeof ListExpertsInputSchema>;

const ExpertInfoSchema = z.object({
  role: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
});

export type ExpertInfo = z.infer<typeof ExpertInfoSchema>;

export const ListExpertsResponseSchema = z.object({
  experts: z.array(ExpertInfoSchema),
  count: z.number(),
});

export type ListExpertsResponse = z.infer<typeof ListExpertsResponseSchema>;

// ============================================================================
// ToolCaller interface
// ============================================================================

export interface ToolCaller {
  call(tool: string, args: Record<string, unknown>): Promise<unknown>;
}

// ============================================================================
// Pipeline types
// ============================================================================

/** Result of testing a single tool. */
export interface ToolTestResult {
  readonly tool: string;
  readonly status: 'pass' | 'fail' | 'skip';
  readonly response?: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

/** Full toolkit audit result. */
export interface ToolkitAudit {
  readonly results: readonly ToolTestResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}
