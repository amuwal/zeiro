import '../lib/sentry';
import type { DraftResult, TriageResult } from '@zeiro/core';
import { triageResultSchema } from '@zeiro/core';
import { draftReply } from '../lib/draft-reply';
import { triageAgent } from '../mastra/agents/triage';
import { GOLDEN_CASES } from './golden-set';
import type { CaseResult, EvalReport, GoldenCase } from './types';

const FIRM_ID = process.env.EVAL_FIRM_ID;

async function main() {
  if (!FIRM_ID) {
    process.stderr.write('EVAL_FIRM_ID env var is required\n');
    process.exit(1);
  }
  const cases: CaseResult[] = [];
  for (const c of GOLDEN_CASES) {
    cases.push(await runCase(c, FIRM_ID));
  }
  const report = summarise(cases);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.summary.passed === report.summary.total ? 0 : 1);
}

async function runCase(c: GoldenCase, firmId: string): Promise<CaseResult> {
  const started = Date.now();
  const triage = await runTriage(c.message.body);
  const result = await draftReply(
    { firmId, clientNotes: null, subject: c.message.subject, body: c.message.body },
    triage,
  );
  return scoreCase(c, result, Date.now() - started);
}

async function runTriage(body: string): Promise<TriageResult> {
  const result = await triageAgent.generate(body, {
    structuredOutput: { schema: triageResultSchema },
  });
  return triageResultSchema.parse(result.object);
}

function scoreCase(c: GoldenCase, result: DraftResult, durationMs: number): CaseResult {
  const failures: string[] = [];
  if (result.kind !== c.expected.kind) {
    failures.push(`kind: expected ${c.expected.kind}, got ${result.kind}`);
  }

  const draftCitations = result.kind === 'draft' ? result.citations : [];
  const matchedSources =
    result.kind === 'draft'
      ? (c.expected.mustMentionSources ?? []).filter((src) =>
          draftCitations.some((cite) => cite.source.includes(src)),
        ).length
      : 0;

  if (result.kind === 'draft') {
    const minCites = c.expected.minCitations ?? 0;
    if (draftCitations.length < minCites) {
      failures.push(`citations: expected >= ${minCites}, got ${draftCitations.length}`);
    }
    const required = c.expected.mustMentionSources?.length ?? 0;
    if (matchedSources < required) {
      failures.push(`sources: matched ${matchedSources}/${required}`);
    }
  }

  return {
    id: c.id,
    expected: c.expected.kind,
    actual: result.kind,
    citationCount: draftCitations.length,
    matchedExpectedSources: matchedSources,
    expectedSourceCount: c.expected.mustMentionSources?.length ?? 0,
    passed: failures.length === 0,
    failures,
    durationMs,
  };
}

function summarise(cases: CaseResult[]): EvalReport {
  const total = cases.length;
  const passed = cases.filter((r) => r.passed).length;
  const drafts = cases.filter((r) => r.actual === 'draft');
  const escalations = cases.filter((r) => r.actual === 'escalate').length;
  const avgCitations =
    drafts.length === 0 ? 0 : drafts.reduce((s, r) => s + r.citationCount, 0) / drafts.length;
  return {
    cases,
    summary: {
      total,
      passed,
      sendWithoutEditCandidate: drafts.length,
      escalationRate: total === 0 ? 0 : escalations / total,
      avgCitationsPerDraft: Number(avgCitations.toFixed(2)),
    },
  };
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
