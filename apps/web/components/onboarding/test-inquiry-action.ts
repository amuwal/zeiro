'use server';

import { createInquiry, listClients, recordAudit } from '@zeiro/db';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';

// Realistic recurring questions across the main categories, so the demo draft
// exercises knowledge / client-context / deadline grounding.
const SAMPLES = [
  {
    subject: '源泉徴収票の送付先について',
    body: '源泉徴収票はどちらの住所宛にお送りすればよろしいでしょうか。ご確認お願いいたします。',
  },
  {
    subject: '法人税の申告期限について',
    body: '今期の法人税の申告期限はいつになりますでしょうか。念のため確認させてください。',
  },
  {
    subject: 'インボイスの登録番号について',
    body: '取引先から当社のインボイス登録番号を聞かれました。番号を教えていただけますか。',
  },
];

// First-run "see it work" button: injects a sample 問い合わせ and runs the exact
// live pipeline (triage → agent → draft), so a firm watches a grounded draft
// appear in seconds without waiting for real mail. Attaches to an existing
// 顧問先 when there is one (so the draft can use its profile); otherwise runs
// unmatched-but-drafted purely as a demo.
export async function sendTestInquiryAction(): Promise<{ inquiryId: string }> {
  const { firmId, userId } = await requireFirmContext();
  const clients = await listClients(firmId);
  const client = clients[0] ?? null;
  const sample = SAMPLES[Date.now() % SAMPLES.length] ?? SAMPLES[0]!;

  const result = await createInquiry({
    firmId,
    clientId: client?.id ?? null,
    messageId: `test-${userId}-${Date.now()}@test.zeiro`,
    receivedAt: new Date().toISOString(),
    subject: `［テスト］${sample.subject}`,
    body: sample.body,
    status: 'pending',
    ...(client ? {} : { unmatchedSender: 'test@example.jp' }),
  });

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: result.id,
    action: 'inquiry.received',
    metadata: { test: true, triggeredBy: userId },
  });

  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId, inquiryId: result.id },
    id: `inquiry-${result.id}`,
  });

  return { inquiryId: result.id };
}
