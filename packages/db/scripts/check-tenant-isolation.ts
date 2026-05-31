/**
 * Static tenant-isolation gate for the repository layer (CLAUDE.md §Security).
 *
 * App-layer firmId filtering is the ONLY enforcement of 守秘義務 (税理士法 §38) —
 * with Neon's serverless driver there is no JWT-aware RLS. This check FAILS the
 * build if a repository export can be reached without a firmId, so the boundary
 * can't silently regress.
 *
 * NECESSARY, NOT SUFFICIENT. A static gate can prove a function *receives* a
 * firmId and that singular by-id mutations *mention* firmId in their `where`;
 * it cannot prove the firmId is actually applied to the predicate in every read
 * (e.g. a `$queryRaw` that SELECTs firm_id but doesn't filter on it, or an
 * unguarded `.update({where:{id}})` like the tombstone leak this gate originally
 * missed). The RUNTIME contract tests in test/tenant-isolation.test.ts are the
 * real enforcement — they seed two firms and assert no cross-firm row is ever
 * observed or mutated. BOTH must run green in CI. This gate is the cheap,
 * always-on first line; the contract suite is the proof.
 *
 * Assertions, over every `*.ts` in src/repositories:
 *   1. Every exported function takes a firmId as its FIRST argument — either a
 *      param literally named `firmId`, or a single object param whose resolved
 *      type has a REQUIRED `firmId` member (optional `firmId?` is rejected).
 *   2. Every SINGULAR Prisma mutation (`.update` / `.delete` / `.upsert`, which
 *      resolve a row by a unique id) must name `firmId` in its `where` — else
 *      the enclosing fn must be allowlisted with a reason (worker by-job-id,
 *      identity table, or a fn that firm-scopes the row with a prior guard).
 *      Prefer `updateMany`/`deleteMany` with `{ id, firmId }`.
 *   3. No `$queryRaw` / `$executeRaw` template omits a `firm_id` PREDICATE —
 *      the literal `firm_id` must co-occur with a comparison (`=`/`IN`/`ANY`)
 *      or an interpolated `${...}` expression, not merely appear as a SELECT
 *      column.
 *
 * Legitimate tenant-discovery lookups (resolve a globally-unique key to derive
 * the firm) and identity/global-scope tables are explicitly allowlisted below —
 * each entry is annotated with WHY it is safe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(here, '../src/repositories');

// Exported functions that legitimately do NOT take firmId first. Every entry is
// a deliberate, reviewed exception — adding to this list is a tenant-boundary
// decision, not a lint silencer.
const FN_ALLOWLIST: Record<string, string> = {
  // --- tenant-discovery: resolve a globally-unique external key to derive the
  //     firm, then the caller scopes everything downstream ---
  findFirmByInboundAddress: 'resolves inbound email address -> firm (discovery)',
  findFirmByClerkOrgId: 'resolves Clerk org -> firm (auth bootstrap)',
  getFirm: 'firm row by its own id (the firm IS the tenant)',
  findDraftByOutboundMessageId: 'resolves SES Message-ID -> {id,inquiryId} only; caller scopes',
  findDraftBySentMessageId: 'resolves SES Message-ID -> {id,inquiryId} only; caller scopes',
  // --- identity table (users span firms via Clerk identity) ---
  findUserByClerkUserId: 'user identity lookup; user is cross-firm',
  getUser: 'user identity by id; cross-firm',
  upsertUser: 'user identity upsert from Clerk webhook; cross-firm',
  deleteUserByClerkUserId: 'user identity delete from Clerk webhook; cross-firm',
  // --- membership rows are keyed (userId, firmId); firmId is present, not first ---
  getMembership: '(userId, firmId) — firmId present as 2nd arg by composite key',
  removeMembership: '(userId, firmId) — firmId present as 2nd arg by composite key',
  listMembershipsByUser: 'lists a user’s firms (the membership row carries firmId)',
  // --- firm provisioning from Clerk webhook (creates the tenant) ---
  upsertFirmFromClerk: 'creates/updates the firm row from Clerk org webhook',
  // --- ingestion-job workers: job id is globally-unique; off-request Inngest ---
  loadIngestionJobBytes: 'worker loads job bytes by globally-unique job id',
  claimIngestionJob: 'worker claims job by globally-unique job id',
  completeIngestionJob: 'worker writes job status by globally-unique job id (status-only)',
  failIngestionJob: 'worker writes job status by globally-unique job id (status-only)',
  // --- curated global knowledge packs (no owning firm; scope=global) ---
  listGlobalKnowledgeChunks: 'global pack listing; rows have no firm_id',
  insertGlobalKnowledgeChunk: 'inserts a scope=global row (no owning firm)',
  deleteGlobalKnowledgeBySource: 'removes a scope=global pack by source (no owning firm)',
};

// Functions whose raw SQL legitimately lacks a firm_id predicate. Same rule:
// each is a tenant-discovery query that re-scopes by firmId immediately after,
// or operates only on global-scope rows.
const RAW_ALLOWLIST: Record<string, string> = {
  walkThread: 'recursive id-walk of a thread; result re-scoped by findMany({firmId,...})',
  findDraftByOutboundMessageId: 'discovery by SES Message-ID; returns ids only',
  findDraftBySentMessageId: 'discovery by SES Message-ID; returns ids only',
  insertGlobalKnowledgeChunk: 'inserts scope=global row; no firm_id by design',
};

// Functions with a SINGULAR by-id mutation whose `where` legitimately lacks a
// firmId literal. Each is reviewed: either the row is firm-scoped by a prior
// guard in the same fn, the key is a globally-unique worker/identity key, or it
// is firm-provisioning. A new unguarded by-id mutation is NOT here, so it fails
// the gate until a human reviews it. Prefer updateMany/deleteMany({id,firmId}).
const BY_ID_MUTATION_ALLOWLIST: Record<string, string> = {
  flagKnowledgeChunk: 'update by chunk.id guarded by prior findFirst({id,firmId})',
  unflagKnowledgeChunk: 'update by chunk.id guarded by prior findFirst({id,firmId})',
  linkClientLineUserId: 'update by client.id guarded by prior findFirst({id,firmId})',
  claimIngestionJob: 'worker update by globally-unique job id (status-only)',
  completeIngestionJob: 'worker update by globally-unique job id (status-only)',
  failIngestionJob: 'worker update by globally-unique job id (status-only)',
  upsertUser: 'identity table upsert by clerkUserId; user is cross-firm',
  deleteUserByClerkUserId: 'identity table delete by clerkUserId; user is cross-firm',
  upsertFirmFromClerk: 'firm provisioning upsert by clerkOrgId (creates the tenant)',
  syncPrimaryAssignee:
    'assignee upsert by (clientId,userId); clientId firm-scoped by caller, create carries firmId',
  addClientAssignee: 'assignee upsert by (clientId,userId); create carries firmId',
  upsertBinding:
    'binding upsert by (clientId,integrationId); integration resolved via {firmId,provider}',
  markInquiryRead: 'inquiry_read upsert by (inquiryId,userId); create carries firmId',
};

type Violation = { file: string; line: number; fn: string; reason: string };

function repoFiles(): string[] {
  return fs
    .readdirSync(REPO_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .map((f) => path.join(REPO_DIR, f));
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function firstParamHasFirmId(fn: ts.FunctionLikeDeclarationBase, checker: ts.TypeChecker): boolean {
  const param = fn.parameters[0];
  if (!param) return false;

  // (firmId: string, ...)
  if (ts.isIdentifier(param.name) && param.name.text === 'firmId') return true;

  // ({ firmId, ... }: T) — destructured object param literally binding firmId
  if (ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      const prop = el.propertyName ?? el.name;
      if (ts.isIdentifier(prop) && prop.text === 'firmId') return true;
    }
  }

  // (input: T) where T resolves to an object type with a REQUIRED `firmId`
  // member. An optional `firmId?` is rejected: a caller could omit it and the
  // query would silently run unscoped.
  const type = checker.getTypeAtLocation(param);
  const prop = checker.getPropertyOfType(type, 'firmId');
  if (!prop) return false;
  return (prop.flags & ts.SymbolFlags.Optional) === 0;
}

function checkExportedFunctions(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  out: Violation[],
): void {
  const rel = path.relative(REPO_DIR, sf.fileName);
  ts.forEachChild(sf, (node) => {
    // export function foo(...) / export async function foo(...)
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node) && node.body) {
      assertFn(node.name.text, node, sf, checker, out, rel);
      return;
    }
    // export const foo = (...) => ... / export const foo = repoFn (alias)
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const init = decl.initializer;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          assertFn(decl.name.text, init, sf, checker, out, rel);
        }
        // `export const x = someFn` — alias: resolve the aliased symbol's params.
        else if (ts.isIdentifier(init)) {
          const sym = checker.getSymbolAtLocation(init);
          const aliasDecl = sym?.valueDeclaration;
          if (
            aliasDecl &&
            (ts.isFunctionDeclaration(aliasDecl) ||
              ts.isArrowFunction(aliasDecl) ||
              ts.isFunctionExpression(aliasDecl)) &&
            aliasDecl.body
          ) {
            assertFn(decl.name.text, aliasDecl, sf, checker, out, rel);
          }
        }
      }
    }
  });
}

function assertFn(
  name: string,
  fn: ts.FunctionLikeDeclarationBase,
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  out: Violation[],
  rel: string,
): void {
  if (name in FN_ALLOWLIST) return;
  if (!firstParamHasFirmId(fn, checker)) {
    out.push({
      file: rel,
      line: lineOf(sf, fn),
      fn: name,
      reason: 'first argument is not firmId (and type has no firmId member)',
    });
  }
}

function hasExportModifier(node: ts.HasModifiers): boolean {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

const RAW_CALLEES = new Set(['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe']);

// `firm_id` must appear in a FILTER position, not merely as a SELECT column. A
// SELECT-only firm_id leaks every firm's rows while the old `/\bfirm_id\b/`
// regex passed it. Accept either:
//   (a) `firm_id` adjacent to a comparison: `firm_id =`, `firm_id IN`, `IS`,
//       `= ANY(...)` — covers every WHERE / JOIN-ON / sub-SELECT predicate, or
//   (b) an INSERT whose VALUES interpolates a firmId-bearing expression
//       (`${input.firmId}` etc.) into the firm_id column — a firm-scoped write.
export function rawSqlFiltersByFirmId(sql: string): boolean {
  if (/\bfirm_id\b\s*(=|<>|!=|\bIN\b|\bIS\b)/i.test(sql)) return true;
  // `= ANY(${...})` style and ` firm_id ... = ANY` (rare) — allow ANY operator.
  if (/\bfirm_id\b[\s\S]{0,40}\bANY\b/i.test(sql) && /=\s*\$\{/.test(sql)) return true;
  // firm-scoped INSERT: firm_id column receives an interpolated firmId value.
  if (
    /\bINSERT\b/i.test(sql) &&
    /\bfirm_id\b/i.test(sql) &&
    /\$\{[^}]*[fF]irmId[^}]*\}/.test(sql)
  ) {
    return true;
  }
  return false;
}

function enclosingFnName(node: ts.Node): string | null {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isFunctionDeclaration(cur) && cur.name) return cur.name.text;
    if (
      (ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) &&
      cur.parent &&
      ts.isVariableDeclaration(cur.parent) &&
      ts.isIdentifier(cur.parent.name)
    ) {
      return cur.parent.name.text;
    }
    cur = cur.parent;
  }
  return null;
}

function checkRawSql(sf: ts.SourceFile, out: Violation[]): void {
  const rel = path.relative(REPO_DIR, sf.fileName);
  const visit = (node: ts.Node): void => {
    // getPrisma().$queryRaw`...`  → a TaggedTemplateExpression whose tag is a
    // property access ending in $queryRaw / $executeRaw.
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = node.tag;
      const calleeName = ts.isPropertyAccessExpression(tag)
        ? tag.name.text
        : ts.isCallExpression(tag) && ts.isPropertyAccessExpression(tag.expression)
          ? tag.expression.name.text
          : null;
      if (calleeName && RAW_CALLEES.has(calleeName)) {
        const sql = node.template.getText(sf);
        const fn = enclosingFnName(node);
        if (!rawSqlFiltersByFirmId(sql) && !(fn && fn in RAW_ALLOWLIST)) {
          out.push({
            file: rel,
            line: lineOf(sf, node),
            fn: fn ?? '(top-level)',
            reason: `raw SQL (${calleeName}) does not FILTER by firm_id (a SELECT-only firm_id column is not enough)`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const SINGULAR_MUTATIONS = new Set(['update', 'delete', 'upsert']);

// Flag SINGULAR Prisma mutations (`model.update/delete/upsert`) whose `where`
// argument does not name `firmId`. These resolve a row by a globally-unique key
// (id, or a composite that may omit firm_id), so without firmId in the predicate
// they can mutate ANOTHER firm's row — exactly the tombstoneClient leak. The
// plural `updateMany`/`deleteMany` are the safe forms (we don't flag them; their
// own `where:{id,firmId}` is what the contract tests assert). A flagged fn must
// be in BY_ID_MUTATION_ALLOWLIST with a reason (guarded / worker / identity).
function checkSingularMutations(sf: ts.SourceFile, out: Violation[]): void {
  const rel = path.relative(REPO_DIR, sf.fileName);
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      SINGULAR_MUTATIONS.has(node.expression.name.text)
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const whereProp = arg.properties.find(
          (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'where',
        );
        if (whereProp && ts.isPropertyAssignment(whereProp)) {
          const whereText = whereProp.initializer.getText(sf);
          if (!/\bfirmId\b/.test(whereText)) {
            const fn = enclosingFnName(node);
            if (!(fn && fn in BY_ID_MUTATION_ALLOWLIST)) {
              out.push({
                file: rel,
                line: lineOf(sf, node),
                fn: fn ?? '(top-level)',
                reason: `singular .${node.expression.name.text}() resolves a row by unique id without firmId in \`where\` — use updateMany/deleteMany({id,firmId}) or allowlist with a reason`,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// Self-test the gate's own rules against known-bad and known-good fixtures, so a
// future loosening of the regex/AST checks is caught here instead of silently
// re-opening the hole. Failures are reported as gate violations (build-failing).
function runSelfTest(out: Violation[]): void {
  const fail = (reason: string) =>
    out.push({ file: '(self-test)', line: 0, fn: 'runSelfTest', reason });

  // raw-SQL predicate rule. The fixtures must contain a literal `${...}` to
  // mirror the Prisma tagged-template text; we assemble it from `i(...)` so the
  // source never contains a real `${` (Biome's noTemplateCurlyInString).
  const D = '$';
  const i = (expr: string): string => `${D}{${expr}}`;
  const rawBad = [
    "SELECT id, firm_id, subject FROM inquiries WHERE status='pending'", // SELECT-only firm_id
    'SELECT id FROM inquiries',
  ];
  const rawGood = [
    `SELECT id FROM inquiries WHERE firm_id = ${i('firmId')}::uuid`,
    `SELECT id FROM k WHERE (firm_id = ${i('firmId')}::uuid OR scope = 'global')`,
    `INSERT INTO knowledge_chunks (firm_id, scope) VALUES (${i('input.firmId')}::uuid, 'firm')`,
    `WHERE id = ANY(${i('ids')}::uuid[]) AND firm_id = ${i('firmId')}::uuid`,
  ];
  for (const sql of rawBad) {
    if (rawSqlFiltersByFirmId(sql))
      fail(`raw-SQL rule wrongly ACCEPTS a non-filtering query: ${sql}`);
  }
  for (const sql of rawGood) {
    if (!rawSqlFiltersByFirmId(sql))
      fail(`raw-SQL rule wrongly REJECTS a firm-scoped query: ${sql}`);
  }

  // singular-mutation rule (regex used inside checkSingularMutations)
  const whereHasFirmId = (w: string) => /\bfirmId\b/.test(w);
  if (whereHasFirmId('{ id: input.clientId }')) {
    fail('singular-mutation rule wrongly treats `{ id }` as firm-scoped');
  }
  if (!whereHasFirmId('{ id: input.clientId, firmId: input.firmId }')) {
    fail('singular-mutation rule wrongly treats `{ id, firmId }` as unscoped');
  }
}

function main(): void {
  const files = repoFiles();
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const violations: Violation[] = [];

  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    checkExportedFunctions(sf, checker, violations);
    checkRawSql(sf, violations);
    checkSingularMutations(sf, violations);
  }

  runSelfTest(violations);

  if (violations.length > 0) {
    process.stderr.write(`\nTENANT ISOLATION GATE FAILED — ${violations.length} violation(s):\n\n`);
    for (const v of violations) {
      process.stderr.write(`  ✗ ${v.file}:${v.line}  ${v.fn}()\n    ${v.reason}\n`);
    }
    process.stderr.write(
      '\nEvery repository export must take firmId first (or carry a REQUIRED firmId' +
        ' in its object arg), every singular .update/.delete/.upsert must name firmId' +
        ' in its `where`, and every raw query must FILTER by firm_id. If this is a' +
        ' legitimate tenant-discovery / global / identity / worker / guarded case, add' +
        ' it to FN_ALLOWLIST / RAW_ALLOWLIST / BY_ID_MUTATION_ALLOWLIST WITH a reason.\n\n',
    );
    process.exit(1);
  }

  const total = files.length;
  process.stdout.write(
    `tenant-isolation gate OK — ${total} repository file(s) checked, ` +
      `${Object.keys(FN_ALLOWLIST).length} fn + ${Object.keys(RAW_ALLOWLIST).length} raw + ` +
      `${Object.keys(BY_ID_MUTATION_ALLOWLIST).length} by-id mutation allowlist entries. ` +
      'NOTE: this AST gate is necessary, not sufficient — the runtime contract ' +
      'tests (pnpm --filter @zeiro/db test) are the real 守秘義務 enforcement.\n',
  );
}

main();
