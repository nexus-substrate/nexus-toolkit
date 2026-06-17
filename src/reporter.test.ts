/**
 * Tests for the report formatter.
 */

import { describe, it, expect } from 'vitest';
import { generateReport, isReportFormat } from './reporter.js';
import type { ReportFormat } from './reporter.js';
import type { ToolkitAudit } from './types.js';

const SAMPLE_AUDIT: ToolkitAudit = {
  results: [
    { tool: 'orchestrate', status: 'pass', durationMs: 5200 },
    { tool: 'research_catalog_review', status: 'pass', durationMs: 150 },
    { tool: 'registry_import', status: 'pass', durationMs: 300 },
    { tool: 'registry_import', status: 'pass', durationMs: 280 },
    { tool: 'registry_import', status: 'fail', error: 'Schema mismatch', durationMs: 100 },
  ],
  passed: 4,
  failed: 1,
  skipped: 0,
};

const SKIP_AUDIT: ToolkitAudit = {
  results: [
    { tool: 'orchestrate', status: 'skip', error: 'No adapter', durationMs: 10 },
    { tool: 'research_catalog_review', status: 'pass', durationMs: 50 },
  ],
  passed: 1,
  failed: 0,
  skipped: 1,
};

describe('generateReport', () => {
  describe('markdown', () => {
    it('includes summary table', () => {
      const report = generateReport(SAMPLE_AUDIT, 'markdown');
      expect(report).toContain('| Passed | 4 |');
      expect(report).toContain('| Failed | 1 |');
    });

    it('includes results table', () => {
      const report = generateReport(SAMPLE_AUDIT, 'markdown');
      expect(report).toContain('| orchestrate | pass |');
      expect(report).toContain('Schema mismatch');
    });

    it('defaults to markdown', () => {
      expect(generateReport(SAMPLE_AUDIT)).toContain('# Toolkit Audit');
    });

    it('escapes markdown table separators in tool and error cells', () => {
      const report = generateReport({
        results: [
          {
            tool: 'registry|import',
            status: 'fail',
            error: 'Schema mismatch: expected foo|bar\nreceived baz',
            durationMs: 100,
          },
        ],
        passed: 0,
        failed: 1,
        skipped: 0,
      });

      expect(report).toContain(
        '| registry\\|import | fail | 100ms | Schema mismatch: expected foo\\|bar received baz |',
      );
    });

    it('fully escapes every pipe and pre-existing backslash so the cell cannot break out', () => {
      // Multiple pipes plus backslashes that, without escaping the backslash
      // first, would let `\|` survive unescaped or let a trailing `\` escape
      // the real column delimiter and break the markdown table structure.
      const report = generateReport({
        results: [
          {
            tool: 'a|b|c',
            status: 'fail',
            error: 'path C:\\tmp\\x and an already-escaped \\| plus a trailing \\',
            durationMs: 100,
          },
        ],
        passed: 0,
        failed: 1,
        skipped: 0,
      });

      const resultRow = report.split('\n').find((l) => l.startsWith('| a'));
      expect(resultRow).toBeDefined();

      // All three pipes from the tool name are escaped (none left bare).
      expect(resultRow).toContain('| a\\|b\\|c | fail |');

      // Every backslash in the input is doubled and every pipe escaped, so the
      // already-escaped `\|` becomes `\\\|` (escaped backslash + escaped pipe)
      // rather than surviving as a bare `\|`, and the trailing backslash is
      // doubled so it cannot escape the closing delimiter.
      expect(resultRow).toContain(
        'path C:\\\\tmp\\\\x and an already-escaped \\\\\\| plus a trailing \\\\ |',
      );

      // No bare (unescaped, odd-count) backslash-pipe or unescaped pipe leaks
      // into the cell body: the row must split into exactly the table columns.
      // 4 columns => 5 cell boundaries (leading + 3 internal + trailing).
      const bareDelimiters = (resultRow ?? '').match(/(^|[^\\])(\\\\)*\|/g) ?? [];
      expect(bareDelimiters.length).toBe(5);
    });
  });

  describe('json', () => {
    it('produces valid JSON', () => {
      const parsed = JSON.parse(generateReport(SAMPLE_AUDIT, 'json')) as ToolkitAudit;
      expect(parsed.passed).toBe(4);
    });
  });

  describe('text', () => {
    it('shows summary and results', () => {
      const report = generateReport(SAMPLE_AUDIT, 'text');
      expect(report).toContain('4 passed');
      expect(report).toContain('PASS orchestrate');
      expect(report).toContain('FAIL registry_import');
    });

    it('shows skip status', () => {
      const report = generateReport(SKIP_AUDIT, 'text');
      expect(report).toContain('SKIP orchestrate');
      expect(report).toContain('No adapter');
    });
  });

  describe('unknown format', () => {
    it('throws instead of returning undefined', () => {
      // Force-cast an arbitrary value, mirroring an unvalidated env var.
      expect(() => generateReport(SAMPLE_AUDIT, 'yaml' as ReportFormat)).toThrow(
        /Unknown report format: yaml/,
      );
    });
  });

  describe('isReportFormat', () => {
    it('accepts the known formats', () => {
      expect(isReportFormat('markdown')).toBe(true);
      expect(isReportFormat('json')).toBe(true);
      expect(isReportFormat('text')).toBe(true);
    });

    it('rejects unknown values', () => {
      expect(isReportFormat('yaml')).toBe(false);
      expect(isReportFormat('')).toBe(false);
      expect(isReportFormat(undefined)).toBe(false);
    });
  });
});
