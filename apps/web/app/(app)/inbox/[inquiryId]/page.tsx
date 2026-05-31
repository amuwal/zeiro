import { getClientDetail, getDraftByInquiry, getInquiry } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { DraftPoller } from '@/components/inquiry/draft-poller';
import { MarkRead } from '@/components/inquiry/mark-read';
import { Sidecar } from '@/components/inquiry/sidecar';
import type { StatusTabData } from '@/components/inquiry/sidecar-tabs/status-tab';
import { deriveSuggestion } from '@/components/inquiry/suggested-action';
import { Thread } from '@/components/inquiry/thread';
import { ThreadSidecarSplit } from '@/components/inquiry/thread-sidecar-split';
import type { Turn } from '@/components/inquiry/turns';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';
import {
  CATEGORY_TO_ID,
  deriveOpenItems,
  formatElapsed,
  formatTime,
  mapCitationsToSources,
  readTriage,
  shortTime,
  toClientTab,
  toInitials,
} from '@/lib/inquiry-mappers';

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const { inquiryId } = await params;
  const ctx = await requireFirmContext();
  const firmId = ctx.firmId;

  const [inquiry, draft] = await Promise.all([
    getInquiry(firmId, inquiryId, viewerScope(ctx)),
    getDraftByInquiry(firmId, inquiryId),
  ]);
  if (!inquiry) notFound();
  const clientDetail = inquiry.clientId ? await getClientDetail(firmId, inquiry.clientId) : null;

  const inqAnalysis = (inquiry.analysis ?? {}) as Record<string, unknown>;
  const inqTriage = readTriage(inquiry.analysis);
  const inqAiReview = (inqAnalysis.aiReview ?? {}) as Record<string, unknown>;
  const senderName = inquiry.client?.name ?? inquiry.unmatchedSender ?? 'Unknown';

  const sources = mapCitationsToSources(draft?.citations);

  const confidence = typeof inqTriage.confidence === 'number' ? inqTriage.confidence : 0.5;
  const recommendation =
    typeof inqAiReview.recommendation === 'string' ? inqAiReview.recommendation : null;
  const reasoning = typeof inqAiReview.reasoning === 'string' ? inqAiReview.reasoning : '';
  const isUrgent = inqTriage.urgency === 'high';

  const suggestion = deriveSuggestion({
    status: inquiry.status,
    confidence,
    isUrgent,
    citationCount: sources.length,
    recommendation,
  });

  const elapsedLabel = formatElapsed(Date.now() - inquiry.receivedAt.getTime());

  const statusTab: StatusTabData = {
    inboundCount: 1,
    outboundCount: inquiry.status === 'sent' ? 1 : 0,
    sentiment: isUrgent ? '至急・不安' : '通常・協力的',
    elapsedLabel,
    openItems: deriveOpenItems(inqAiReview),
    reasoning: reasoning || '判定理由は未生成です。',
    timeline: [
      {
        time: shortTime(inquiry.receivedAt),
        label: '受信',
        sub: inquiry.client?.name ?? inquiry.unmatchedSender ?? '',
        state: 'done',
      },
      {
        time: shortTime(inquiry.receivedAt),
        label: 'AI分類',
        sub: `${typeof inqTriage.category === 'string' ? inqTriage.category : 'その他'} · 信頼度 ${Math.round(confidence * 100)}%`,
        state: draft ? 'done' : 'now',
      },
      ...(draft
        ? [
            {
              time: shortTime(draft.createdAt),
              label: '下書き生成',
              sub: `${sources.length}件参照`,
              state: 'done' as const,
            },
          ]
        : []),
      ...(inquiry.status === 'sent'
        ? [{ time: '—', label: '送信完了', sub: 'アーカイブ可能', state: 'done' as const }]
        : [{ time: '—', label: '送信', sub: '承認待ち', state: 'pending' as const }]),
    ],
    audit: {
      channel:
        inquiry.channel === 'email'
          ? 'メール'
          : inquiry.channel === 'line'
            ? 'LINE'
            : inquiry.channel === 'chatwork'
              ? 'Chatwork'
              : 'Webフォーム',
      threadId: `INQ-${inquiry.id.slice(0, 8).toUpperCase()}`,
      tenantIsolation: '有効',
      recording: '全イベント保存',
    },
  };

  const turns: Turn[] = [
    {
      kind: 'incoming',
      who: {
        name: senderName,
        role: inquiry.client?.name ? `· ${inquiry.client.name}` : '',
        initials: toInitials(senderName),
      },
      time: formatTime(inquiry.receivedAt),
      body: inquiry.body,
    },
  ];
  if (inquiry.status === 'sent' && draft) {
    turns.push({
      kind: 'outgoing',
      who: { name: 'AI Agent', role: '送信済', initials: 'SK' },
      time: formatTime(draft.createdAt),
      body: draft.body,
    });
  }

  const draftView = draft
    ? {
        body: draft.body,
        citationCount: sources.length,
        confidence: draft.confidence,
        model: draft.model,
        time: formatTime(draft.createdAt),
      }
    : null;

  return (
    <>
      <MarkRead inquiryId={inquiry.id} />
      <DraftPoller inquiryId={inquiry.id} status={inquiry.status} />
      <ThreadSidecarSplit
        thread={
          <Thread
            meta={{
              id: inquiry.id,
              subject: inquiry.subject,
              senderName,
              senderRole: '',
              senderCompany: inquiry.client?.name ?? '',
              senderInitials: toInitials(senderName),
              category:
                (CATEGORY_TO_ID[
                  typeof inqTriage.category === 'string' ? inqTriage.category : 'その他'
                ] as string) ?? 'other',
            }}
            turns={turns}
            draft={draftView}
            suggestion={suggestion}
            inquiryStatus={inquiry.status}
            unmatchedSender={inquiry.unmatchedSender}
            assignedTo={inquiry.assignedTo}
            canDraft={ctxCan(ctx, 'inquiry.draft')}
            canSend={ctxCan(ctx, 'inquiry.send')}
          />
        }
        sidecar={
          <Sidecar
            inquiryId={inquiry.id}
            inquiryStatus={inquiry.status}
            lifecycleLabel={inquiry.status === 'sent' ? '完了' : '対応中'}
            lifecycleState={inquiry.status === 'sent' ? 'resolved' : 'open'}
            sources={sources}
            client={toClientTab(clientDetail)}
            status={statusTab}
          />
        }
      />
    </>
  );
}
