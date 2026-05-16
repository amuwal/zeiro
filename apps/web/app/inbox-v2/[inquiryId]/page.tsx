import { getClientDetail, getDraftByInquiry, getInquiry } from '@zeiro/db';
import { notFound } from 'next/navigation';
import type { ClientTabData } from '@/components/inquiry-v2/sidecar-tabs/client-tab';
import type { SourceItem } from '@/components/inquiry-v2/sidecar-tabs/sources-tab';
import type { StatusTabData } from '@/components/inquiry-v2/sidecar-tabs/status-tab';
import { SidecarV2 } from '@/components/inquiry-v2/sidecar';
import { deriveSuggestion, type SuggestionView } from '@/components/inquiry-v2/suggested-action';
import { ThreadV2 } from '@/components/inquiry-v2/thread';
import type { Turn } from '@/components/inquiry-v2/turns';
import { requireFirmContext } from '@/lib/firm-context';

const CATEGORY_TO_ID: Record<string, string> = {
  期日確認: 'deadline',
  書類提出: 'docs',
  税務質問: 'tax',
  顧問契約: 'contract',
  その他: 'other',
};

export default async function InquiryV2Page({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const { inquiryId } = await params;
  const { firmId } = await requireFirmContext();

  const [inquiry, draft] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getDraftByInquiry(inquiryId),
  ]);
  if (!inquiry) notFound();
  const clientDetail = inquiry.clientId
    ? await getClientDetail(firmId, inquiry.clientId)
    : null;

  const inqAnalysis = (inquiry.analysis ?? {}) as Record<string, unknown>;
  const inqTriage = (inqAnalysis.triage ?? {}) as Record<string, unknown>;
  const inqAiReview = (inqAnalysis.aiReview ?? {}) as Record<string, unknown>;
  const senderName = inquiry.client?.name ?? inquiry.unmatchedSender ?? 'Unknown';

  const draftCitations = Array.isArray(draft?.citations) ? draft.citations : [];
  const sources: SourceItem[] = draftCitations.map((c, i) => {
    const cite = c as { source?: string; snippet?: string };
    const src = typeof cite.source === 'string' ? cite.source : '';
    const [sourceName, section] = src.includes('/')
      ? src.split('/').map((s) => s.trim())
      : [src, ''];
    return {
      id: `c${i + 1}`,
      title: typeof cite.snippet === 'string' ? cite.snippet.slice(0, 80) : src,
      src: sourceName ?? src,
      section: section ?? '',
      status: 'fresh' as const,
      score: 0.85 - i * 0.05,
    };
  });

  const inquiryConfidence = typeof inqTriage.confidence === 'number' ? inqTriage.confidence : 0.5;
  const inquiryRecommendation =
    typeof inqAiReview.recommendation === 'string' ? inqAiReview.recommendation : null;
  const inquiryReasoning = typeof inqAiReview.reasoning === 'string' ? inqAiReview.reasoning : '';
  const inquiryIsUrgent = inqTriage.urgency === 'high';

  const suggestion: SuggestionView = deriveSuggestion({
    status: inquiry.status,
    confidence: inquiryConfidence,
    isUrgent: inquiryIsUrgent,
    citationCount: sources.length,
    recommendation: inquiryRecommendation,
  });

  const elapsed = Date.now() - inquiry.receivedAt.getTime();
  const elapsedLabel = formatElapsed(elapsed);

  const clientTab: ClientTabData | null = clientDetail
    ? {
        id: clientDetail.id,
        initials: toInitials(clientDetail.name),
        company: clientDetail.name,
        contactName: clientDetail.name,
        contactRole: clientDetail.contractType,
        tags: [clientDetail.contractType],
        contract: clientDetail.contractType,
        monthlyFee: 0,
        since: '—',
        fiscalYearEnd: '—',
        industry: '—',
        lifetimeInquiries: clientDetail.inquiryCount,
        avgFirstReplyMin: 0,
        openCount: 0,
        note: clientDetail.notes ?? '',
      }
    : null;

  const statusTab: StatusTabData = {
    inboundCount: 1,
    outboundCount: inquiry.status === 'sent' ? 1 : 0,
    sentiment: inquiryIsUrgent ? '至急・不安' : '通常・協力的',
    elapsedLabel,
    openItems: deriveOpenItems(inqAiReview),
    reasoning: inquiryReasoning || '判定理由は未生成です。',
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
        sub:
          `${typeof inqTriage.category === 'string' ? inqTriage.category : 'その他'} · 信頼度 ${Math.round(inquiryConfidence * 100)}%`,
        state: draft ? 'done' : 'now',
      },
      ...(draft
        ? [{ time: shortTime(draft.createdAt), label: '下書き生成', sub: `${sources.length}件参照`, state: 'done' as const }]
        : []),
      ...(inquiry.status === 'sent'
        ? [{ time: '—', label: '送信完了', sub: 'アーカイブ可能', state: 'done' as const }]
        : [{ time: '—', label: '送信', sub: '承認待ち', state: 'pending' as const }]),
    ],
    audit: {
      channel: inquiry.channel === 'email' ? 'メール' : inquiry.channel === 'line' ? 'LINE' : 'Webフォーム',
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
  if (draft) {
    const blocks = blocksFromDraft(draft);
    turns.push({
      kind: 'draft',
      who: { name: 'AI Agent', role: '下書きを生成', initials: 'AI' },
      time: formatTime(draft.createdAt),
      version: 1,
      blocks,
      citationCount: sources.length,
      confidence: draft.confidence,
      model: draft.model,
    });
  }
  if (inquiry.status === 'sent' && draft) {
    turns.push({
      kind: 'outgoing',
      who: { name: 'AI Agent', role: '送信済', initials: 'SK' },
      time: formatTime(draft.createdAt),
      body: draft.body,
    });
  }

  return (
    <>
      <ThreadV2
        meta={{
          id: inquiry.id,
          subject: inquiry.subject,
          senderName,
          senderRole: '',
          senderCompany: inquiry.client?.name ?? '',
          senderInitials: toInitials(senderName),
          category:
            (CATEGORY_TO_ID[typeof inqTriage.category === 'string' ? inqTriage.category : 'その他'] as string) ?? 'other',
        }}
        turns={turns}
      />
      <SidecarV2
        inquiryId={inquiry.id}
        lifecycleLabel={inquiry.status === 'sent' ? '完了' : '対応中'}
        lifecycleState={inquiry.status === 'sent' ? 'resolved' : 'open'}
        suggestion={suggestion}
        sources={sources}
        client={clientTab}
        status={statusTab}
      />
    </>
  );
}

function formatTime(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type DraftLike = {
  body: string;
  citations: unknown;
  metadata?: unknown;
};

function blocksFromDraft(draft: DraftLike): Array<{ text: string; cite: string | null }> {
  // citationBlocks (from Citations API) lives in draft.metadata.citationBlocks
  // if it was stored — otherwise fall back to body-only single block.
  const metadata = (draft.metadata ?? {}) as Record<string, unknown>;
  const cb = metadata.citationBlocks;
  if (Array.isArray(cb) && cb.length > 0) {
    return cb
      .map((b) => {
        const obj = b as { text?: string; citationIndexes?: number[] };
        if (typeof obj.text !== 'string') return null;
        const idx = Array.isArray(obj.citationIndexes) ? obj.citationIndexes[0] : undefined;
        const cite = typeof idx === 'number' ? `c${idx + 1}` : null;
        return { text: obj.text, cite };
      })
      .filter((b): b is { text: string; cite: string | null } => b !== null);
  }
  return [{ text: draft.body, cite: null }];
}

function toInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s ]+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function shortTime(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60 * 24) return `${Math.floor(min / 60 / 24)}日`;
  if (min >= 60) return `${Math.floor(min / 60)}時間`;
  if (min >= 1) return `${min}分${sec}秒`;
  return `${sec}秒`;
}

function deriveOpenItems(aiReview: Record<string, unknown>): string[] {
  const suggestions = aiReview.suggestions;
  if (Array.isArray(suggestions)) return suggestions.filter((s): s is string => typeof s === 'string');
  const gaps = aiReview.gaps;
  if (Array.isArray(gaps)) return gaps.filter((s): s is string => typeof s === 'string');
  return [];
}
