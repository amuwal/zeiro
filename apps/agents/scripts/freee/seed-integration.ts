/**
 * Insert an `integrations` row directly from FREEE_ACCESS_TOKEN + FREEE_COMPANY_ID,
 * bypassing the OAuth flow. Useful for end-to-end testing against a known token
 * (e.g. the dashboard-issued personal token we already have).
 *
 *   pnpm tsx scripts/freee/seed-integration.ts <firmId> [clientId]
 *
 * If clientId is provided, also writes a ClientIntegrationBinding so the
 * lookup-freee-books tool can resolve the 事業所 for that client.
 */
import './load-env';
import { upsertBinding, upsertIntegration } from '@zeiro/db';
import { encrypt } from '@zeiro/integrations';

const FREEE_API = 'https://api.freee.co.jp';

async function main() {
  const firmId = process.argv[2];
  const clientId = process.argv[3];
  if (!firmId) {
    console.error('usage: pnpm tsx scripts/freee/seed-integration.ts <firmId> [clientId]');
    process.exit(1);
  }
  const accessToken = process.env.FREEE_ACCESS_TOKEN;
  const companyId = process.env.FREEE_COMPANY_ID;
  if (!accessToken || !companyId) {
    console.error('FREEE_ACCESS_TOKEN and FREEE_COMPANY_ID required in env');
    process.exit(1);
  }

  console.log(`[seed] fetching 事業所 list to populate integration metadata…`);
  const res = await fetch(`${FREEE_API}/api/1/companies`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(`freee /companies → ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const { companies } = (await res.json()) as {
    companies: Array<{ id: number; name: string; role: string }>;
  };
  console.log(`[seed] visible companies: ${companies.map((c) => `${c.id} (${c.role})`).join(', ')}`);

  const target = companies.find((c) => String(c.id) === companyId);
  if (!target) {
    console.error(`FREEE_COMPANY_ID=${companyId} not visible to token`);
    process.exit(1);
  }

  const integration = await upsertIntegration({
    firmId,
    provider: 'freee',
    accessToken: encrypt(accessToken),
    refreshToken: null,
    tokenType: 'Bearer',
    scope: 'read',
    expiresAt: null,
    metadata: {
      companies: companies.map((c) => ({ id: String(c.id), name: c.name, role: c.role })),
      companiesFetchedAt: new Date().toISOString(),
      seedSource: 'dashboard-personal-token',
    },
  });
  console.log(`[seed] integration upserted → id=${integration.id} status=${integration.status}`);

  if (clientId) {
    const binding = await upsertBinding({
      firmId,
      clientId,
      provider: 'freee',
      externalId: String(target.id),
      externalName: target.name,
    });
    console.log(
      `[seed] binding upserted → id=${binding.id} client=${clientId} → 事業所 ${target.id} (${target.name})`,
    );
  } else {
    console.log('[seed] no clientId given; skipping per-client binding');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] FAILED:', e);
  process.exit(1);
});
