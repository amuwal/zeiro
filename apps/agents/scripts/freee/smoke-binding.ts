/**
 * End-to-end smoke for the DB-backed freee path (adapter token refresh →
 * FreeeApiClient → real freee API), as used by lookup-freee-books and the
 * binding-test action. Run from repo root with env loaded:
 *   env $(grep -E '^(DATABASE_URL|FREEE_)' .env | xargs) pnpm --filter @zeiro/agents tsx scripts/freee/smoke-binding.ts <firmId> <clientId>
 */
import { FreeeApiClient, registerFreee } from '@zeiro/integrations';

registerFreee({
  clientId: process.env.FREEE_CLIENT_ID ?? '',
  clientSecret: process.env.FREEE_CLIENT_SECRET ?? '',
  redirectUri: process.env.FREEE_REDIRECT_URI ?? '',
});

async function main() {
  const [firmId, clientId] = process.argv.slice(2);
  if (!firmId || !clientId) throw new Error('usage: smoke-binding.ts <firmId> <clientId>');
  const client = await FreeeApiClient.forClient(firmId, clientId);
  const deals = await client.listRecentDeals({ limit: 3, daysBack: 365 });
  const partners = await client.listPartners({ limit: 5 });
  const names = await client.accountItemNames().catch((e) => `ERR ${e?.message}`);
  const invoices = await client.listInvoices({ limit: 5 }).catch((e) => `ERR ${e?.message}`);
  const pl = await client.profitAndLoss().catch((e) => `ERR ${e?.message}`);
  const nameCount = names instanceof Map ? names.size : names;
  process.stdout.write(
    `OK deals=${deals.length} partners=${partners.length} accountItems=${nameCount}\n` +
      `sampleDeal=${JSON.stringify(deals[0] ?? null)}\n` +
      `partnerNames=${JSON.stringify(partners.map((p) => p.name))}\n` +
      `invoices=${Array.isArray(invoices) ? invoices.length : invoices}\n` +
      `sampleInvoice=${JSON.stringify(Array.isArray(invoices) ? (invoices[0] ?? null) : invoices)}\n` +
      `profitLoss=${JSON.stringify(pl)}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    process.stderr.write(`FAIL ${e?.name ?? ''}: ${e?.message ?? String(e)}\n`);
    process.exit(1);
  });
