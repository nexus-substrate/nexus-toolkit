/**
 * Toolkit audit pipeline — tests orchestrate, research_catalog_review, registry_import.
 */

import {
  OrchestrateResponseSchema,
  CatalogReviewResponseSchema,
  RegistryImportResponseSchema,
  type ToolCaller,
  type ToolTestResult,
  type ToolkitAudit,
} from './types.js';

// ---------------------------------------------------------------------------
// Individual tool testers
// ---------------------------------------------------------------------------

export async function testOrchestrate(
  caller: ToolCaller,
  task: string,
): Promise<ToolTestResult> {
  const start = Date.now();
  try {
    const raw = await caller.call('orchestrate', { task, maxIterations: 1, timeout: 15000 });
    const parsed = OrchestrateResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { tool: 'orchestrate', status: 'fail', error: `Schema: ${parsed.error.message}`, durationMs: Date.now() - start };
    }
    return { tool: 'orchestrate', status: 'pass', response: parsed.data, durationMs: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Orchestrate is not-applicable when no model adapter is configured/available.
    // Match only those specific signals — NOT the generic word "failed", which
    // appears in many genuine errors (e.g. "orchestration failed: adapter timeout")
    // that must stay `fail` so the audit surfaces real regressions.
    if (
      msg.includes('not idle') ||
      msg.includes('not configured') ||
      msg.includes('no adapter') ||
      msg.includes('no model adapter')
    ) {
      return { tool: 'orchestrate', status: 'skip', error: msg, durationMs: Date.now() - start };
    }
    return { tool: 'orchestrate', status: 'fail', error: msg, durationMs: Date.now() - start };
  }
}

export async function testCatalogReview(
  caller: ToolCaller,
  action: string,
): Promise<ToolTestResult> {
  const start = Date.now();
  try {
    const raw = await caller.call('research_catalog_review', { action });
    const parsed = CatalogReviewResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { tool: 'research_catalog_review', status: 'fail', error: `Schema: ${parsed.error.message}`, durationMs: Date.now() - start };
    }
    return { tool: 'research_catalog_review', status: 'pass', response: parsed.data, durationMs: Date.now() - start };
  } catch (e) {
    return { tool: 'research_catalog_review', status: 'fail', error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
  }
}

export async function testRegistryImport(
  caller: ToolCaller,
  provider: string,
  modelId: string,
): Promise<ToolTestResult> {
  const start = Date.now();
  try {
    const raw = await caller.call('registry_import', { provider, modelId, dryRun: true });
    const parsed = RegistryImportResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { tool: 'registry_import', status: 'fail', error: `Schema: ${parsed.error.message}`, durationMs: Date.now() - start };
    }
    if (!parsed.data.dryRun) {
      return { tool: 'registry_import', status: 'fail', error: 'Expected dryRun=true', durationMs: Date.now() - start };
    }
    return { tool: 'registry_import', status: 'pass', response: parsed.data, durationMs: Date.now() - start };
  } catch (e) {
    return { tool: 'registry_import', status: 'fail', error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// Full audit
// ---------------------------------------------------------------------------

export async function runToolkitAudit(caller: ToolCaller): Promise<ToolkitAudit> {
  const results: ToolTestResult[] = [];

  // Test orchestrate
  results.push(await testOrchestrate(caller, 'List main programming languages'));

  // Test catalog review (list is read-only and safe)
  results.push(await testCatalogReview(caller, 'list'));

  // Test registry import (dry run for all 3 providers)
  results.push(await testRegistryImport(caller, 'anthropic', 'claude-opus-4-6'));
  results.push(await testRegistryImport(caller, 'google', 'gemini-2.0-flash'));
  results.push(await testRegistryImport(caller, 'openai', 'codex-5.3'));

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  return { results, passed, failed, skipped };
}
