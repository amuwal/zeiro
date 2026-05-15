import '../lib/env-loader';
import '../lib/sentry';
import type { DraftResult, TriageResult } from '@zeiro/core';
import { triageResultSchema } from '@zeiro/core';
import type { KnowledgeHit } from '@zeiro/db';
import { type DraftDiagnostics, runDraftPipeline } from '../lib/draft-reply';
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
  const { result, diagnostics } = await runDraftPipeline(
    { firmId, clientNotes: null, subject: c.message.subject, body: c.message.body },
    triage,
  );
  return scoreCase(c, result, diagnostics, Date.now() - started);
}

async function runTriage(body: string): Promise<TriageResult> {
  const result = await triageAgent.generate(body, {
    structuredOutput: { schema: triageResultSchema },
  });
  return triageResultSchema.parse(result.object);
}

function scoreCase(
  c: GoldenCase,
  result: DraftResult,
  diagnostics: DraftDiagnostics,
  durationMs: number,
): CaseResult {
  const failures: string[] = [];
  if (result.kind !== c.expected.kind) {
    failures.push(`kind: expected ${c.expected.kind}, got ${result.kind}`);
  }

  const required = c.expected.mustMentionSources ?? [];
  const retrievalRecall = scoreRetrievalRecall(diagnostics.hits, required);
  if (required.length > 0) {
    const retrievedCount = Math.round(retrievalRecall * required.length);
    if (retrievedCount < required.length) {
      failures.push(`retrieval: ${retrievedCount}/${required.length} required sources in hits`);
    }
  }

  const draftCitations = result.kind === 'draft' ? result.citations : [];
  const matchedSources =
    result.kind === 'draft'
      ? required.filter((src) => draftCitations.some((cite) => cite.source.includes(src))).length
      : 0;

  if (result.kind === 'draft') {
    const minCites = c.expected.minCitations ?? 0;
    if (draftCitations.length < minCites) {
      failures.push(`citations: expected >= ${minCites}, got ${draftCitations.length}`);
    }
    if (matchedSources < required.length) {
      failures.push(`cited sources: matched ${matchedSources}/${required.length}`);
    }
  }

  const citationAccuracy = scoreCitationAccuracy(draftCitations, diagnostics.hits);
  if (draftCitations.length > 0 && citationAccuracy < 1) {
    const grounded = Math.round(citationAccuracy * draftCitations.length);
    failures.push(
      `citation accuracy: ${grounded}/${draftCitations.length} citations grounded in source content`,
    );
  }

  return {
    id: c.id,
    expected: c.expected.kind,
    actual: result.kind,
    citationCount: draftCitations.length,
    matchedExpectedSources: matchedSources,
    expectedSourceCount: required.length,
    retrievalRecall,
    retrievedHitCount: diagnostics.hits.length,
    citationAccuracy,
    passed: failures.length === 0,
    failures,
    durationMs,
  };
}

function scoreRetrievalRecall(hits: KnowledgeHit[], required: string[]): number {
  if (required.length === 0) return 1;
  const hitSources = hits.map((h) => h.source);
  const matched = required.filter((src) => hitSources.some((source) => source.includes(src)));
  return matched.length / required.length;
}

function scoreCitationAccuracy(
  citations: { source: string; snippet: string }[],
  hits: KnowledgeHit[],
): number {
  if (citations.length === 0) return 1;
  const sourceContent = new Map<string, string>();
  for (const hit of hits) sourceContent.set(hit.source, hit.content);
  let grounded = 0;
  for (const cite of citations) {
    if (cite.snippet.length === 0) continue;
    const content = sourceContent.get(cite.source);
    if (content?.includes(cite.snippet)) grounded += 1;
  }
  return grounded / citations.length;
}

function summarise(cases: CaseResult[]): EvalReport {
  const total = cases.length;
  const passed = cases.filter((r) => r.passed).length;
  const drafts = cases.filter((r) => r.actual === 'draft');
  const escalations = cases.filter((r) => r.actual === 'escalate').length;
  const avgCitations =
    drafts.length === 0 ? 0 : drafts.reduce((s, r) => s + r.citationCount, 0) / drafts.length;
  const casesWithRequiredSources = cases.filter((r) => r.expectedSourceCount > 0);
  const avgRetrievalRecall =
    casesWithRequiredSources.length === 0
      ? 1
      : casesWithRequiredSources.reduce((s, r) => s + r.retrievalRecall, 0) /
        casesWithRequiredSources.length;
  const draftsWithCitations = drafts.filter((r) => r.citationCount > 0);
  const avgCitationAccuracy =
    draftsWithCitations.length === 0
      ? 1
      : draftsWithCitations.reduce((s, r) => s + r.citationAccuracy, 0) /
        draftsWithCitations.length;
  return {
    cases,
    summary: {
      total,
      passed,
      sendWithoutEditCandidate: drafts.length,
      escalationRate: total === 0 ? 0 : escalations / total,
      avgCitationsPerDraft: Number(avgCitations.toFixed(2)),
      avgRetrievalRecall: Number(avgRetrievalRecall.toFixed(3)),
      avgCitationAccuracy: Number(avgCitationAccuracy.toFixed(3)),
    },
  };
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
