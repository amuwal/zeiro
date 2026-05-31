/**
 * Verifies the RBAC permission matrix + per-client scoping against the real DB.
 *   env $(grep -E '^DATABASE_URL=' .env | xargs) pnpm --filter @zeiro/web exec tsx scripts/verify-rbac.ts
 * Creates a temporary staff member + assignment in the seeded test firm, asserts
 * visibility, then cleans up.
 */
import { can } from '@zeiro/core';
import {
  addClientAssignee,
  getInquiry,
  getPrisma,
  listInquiryThreads,
  removeClientAssignee,
  removeMembership,
  upsertMembership,
  upsertUser,
} from '@zeiro/db';

const FIRM = 'be11a00c-835f-49d3-8cb4-d9753f2cfcda';
let failures = 0;
function check(label: string, cond: boolean) {
  process.stdout.write(`${cond ? '✅' : '❌'} ${label}\n`);
  if (!cond) failures++;
}

async function main() {
  // 1. Permission matrix
  check(
    'owner can manage integrations',
    can({ role: 'owner', canSend: true }, 'integration.manage'),
  );
  check(
    'reviewer CANNOT manage integrations',
    !can({ role: 'reviewer', canSend: true }, 'integration.manage'),
  );
  check('reviewer can send', can({ role: 'reviewer', canSend: false }, 'inquiry.send'));
  check(
    'staff WITHOUT canSend cannot send',
    !can({ role: 'staff', canSend: false }, 'inquiry.send'),
  );
  check('staff WITH canSend can send', can({ role: 'staff', canSend: true }, 'inquiry.send'));
  check('staff can draft', can({ role: 'staff', canSend: false }, 'inquiry.draft'));
  check('viewer CANNOT draft', !can({ role: 'viewer', canSend: false }, 'inquiry.draft'));
  check(
    'only owner manages members',
    can({ role: 'owner', canSend: true }, 'member.manage') &&
      !can({ role: 'reviewer', canSend: true }, 'member.manage'),
  );
  check(
    'only owner tombstones',
    can({ role: 'owner', canSend: true }, 'client.tombstone') &&
      !can({ role: 'reviewer', canSend: true }, 'client.tombstone'),
  );

  // 2. Scoping — pick a client that has inquiries
  const prisma = getPrisma();
  const withClient = await prisma.inquiry.findFirst({
    where: { firmId: FIRM, clientId: { not: null } },
    select: { clientId: true },
  });
  if (!withClient?.clientId) {
    process.stdout.write('⚠️  no client-linked inquiries in test firm — skipping scope checks\n');
    process.exit(failures > 0 ? 1 : 0);
  }
  const clientId = withClient.clientId;
  const user = await upsertUser({
    clerkUserId: 'test_rbac_staff_TEMP',
    email: 'rbac-staff@test.invalid',
    name: 'RBAC Test Staff',
  });
  try {
    await upsertMembership({
      userId: user.id,
      firmId: FIRM,
      role: 'org:member',
      appRole: 'staff',
      canSend: false,
      clientScope: 'assigned',
    });
    const scope = { userId: user.id, seeAll: false };

    const before = await listInquiryThreads(FIRM, undefined, scope);
    check('staff with no assignment sees 0 inquiries', before.length === 0);

    await addClientAssignee({ firmId: FIRM, clientId, userId: user.id, role: 'primary' });
    const after = await listInquiryThreads(FIRM, undefined, scope);
    check('staff sees inquiries after assignment', after.length > 0);
    check(
      'staff sees ONLY assigned client',
      after.every((t) => t.clientId === clientId || t.assignedToId === user.id),
    );

    const all = await listInquiryThreads(FIRM, undefined, { userId: user.id, seeAll: true });
    check(
      'seeAll returns >= assigned-scope',
      all.length >= after.length && all.length > after.length,
    );

    const otherInq = await prisma.inquiry.findFirst({
      where: { firmId: FIRM, clientId: { not: null }, AND: [{ clientId: { not: clientId } }] },
      select: { id: true },
    });
    if (otherInq) {
      const blocked = await getInquiry(FIRM, otherInq.id, scope);
      check('staff CANNOT open a non-assigned inquiry (object-level)', blocked === null);
      const allowed = await getInquiry(FIRM, otherInq.id, { userId: user.id, seeAll: true });
      check('owner/seeAll CAN open it', allowed !== null);
    }
  } finally {
    await removeClientAssignee(FIRM, clientId, user.id).catch(() => {});
    await removeMembership(user.id, FIRM).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }

  process.stdout.write(
    failures === 0 ? '\nALL RBAC CHECKS PASSED\n' : `\n${failures} CHECK(S) FAILED\n`,
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  process.stderr.write(`error: ${e?.message ?? e}\n`);
  process.exit(1);
});
