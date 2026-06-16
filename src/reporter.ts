/**
 * Report formatter for toolkit audit results.
 */

import type { ToolkitAudit } from './types.js';

export type ReportFormat = 'markdown' | 'json' | 'text';

export const REPORT_FORMATS: readonly ReportFormat[] = ['markdown', 'json', 'text'];

/** Type guard: is `value` one of the supported report formats? */
export function isReportFormat(value: unknown): value is ReportFormat {
  return typeof value === 'string' && (REPORT_FORMATS as readonly string[]).includes(value);
}

export function generateReport(
  audit: ToolkitAudit,
  format: ReportFormat = 'markdown',
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(audit, null, 2);
    case 'text':
      return formatText(audit);
    case 'markdown':
      return formatMarkdown(audit);
    default:
      // `format` is typed `ReportFormat`, but callers can force-cast an
      // arbitrary string (e.g. from an env var). Fail loudly instead of
      // returning `undefined` and printing the literal "undefined".
      throw new Error(
        `Unknown report format: ${String(format)}. Expected one of: ${REPORT_FORMATS.join(', ')}`,
      );
  }
}

function statusIcon(status: string): string {
  if (status === 'pass') return 'PASS';
  if (status === 'skip') return 'SKIP';
  return 'FAIL';
}

function formatText(a: ToolkitAudit): string {
  const lines = [
    `Toolkit Audit: ${a.passed} passed, ${a.failed} failed, ${a.skipped} skipped`,
    '',
  ];
  for (const r of a.results) {
    const err = r.error ? ` — ${r.error}` : '';
    lines.push(`  ${statusIcon(r.status)} ${r.tool} (${r.durationMs}ms)${err}`);
  }
  return lines.join('\n');
}

function markdownCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function formatMarkdown(a: ToolkitAudit): string {
  const lines = [
    '# Toolkit Audit',
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Passed | ${a.passed} |`,
    `| Failed | ${a.failed} |`,
    `| Skipped | ${a.skipped} |`,
    '',
    '## Results',
    '',
    '| Tool | Status | Duration | Error |',
    '| --- | --- | --- | --- |',
  ];
  for (const r of a.results) {
    const err = markdownCell(r.error ?? '');
    lines.push(`| ${markdownCell(r.tool)} | ${r.status} | ${r.durationMs}ms | ${err} |`);
  }
  return lines.join('\n');
}
