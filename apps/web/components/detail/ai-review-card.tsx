import type { AiReview } from '@zeiro/core';
import { Icon, type IconName } from '@/components/ui/icon';

type Mode = {
  cls: string;
  icon: IconName;
  badge: string;
  title: string;
};

const MODES: Record<AiReview['recommendation'], Mode> = {
  send_as_is: {
    cls: 'send',
    icon: 'check',
    badge: 'AI 判定: 送信可',
    title: 'そのまま送信できます',
  },
  review_required: {
    cls: 'review',
    icon: 'alert',
    badge: 'AI 判定: 要レビュー',
    title: '送信前に内容のご確認をお願いします',
  },
  human_handoff: {
    cls: 'handoff',
    icon: 'flag',
    badge: 'AI 判定: 担当者対応',
    title: '所長税理士または担当者の対応が必要です',
  },
  no_reply_needed: {
    cls: 'noreply',
    icon: 'archive',
    badge: 'AI 判定: 返信不要',
    title: 'このメッセージは返信不要と判断しました',
  },
};

const CONFIDENCE_LABEL: Record<AiReview['confidence'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function AiReviewCard({ review }: { review: AiReview }) {
  const mode = MODES[review.recommendation];
  return (
    <section className={`ai-review ${mode.cls}`}>
      <header className="ai-review-head">
        <span className="ai-review-icon">
          <Icon name={mode.icon} size={14} />
        </span>
        <div className="ai-review-headline">
          <span className="ai-review-badge">{mode.badge}</span>
          <strong className="ai-review-title">{mode.title}</strong>
        </div>
        <span
          className="ai-review-conf"
          title={`AI 確信度: ${CONFIDENCE_LABEL[review.confidence]}`}
        >
          確信度 <strong>{CONFIDENCE_LABEL[review.confidence]}</strong>
        </span>
      </header>

      <p className="ai-review-reasoning">{review.reasoning}</p>

      {review.gaps.length > 0 && (
        <div className="ai-review-block">
          <span className="ai-review-block-title">不明点</span>
          <ul>
            {review.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {review.suggestions.length > 0 && (
        <div className="ai-review-block">
          <span className="ai-review-block-title">確認推奨</span>
          <ul>
            {review.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
