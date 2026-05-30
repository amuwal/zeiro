import { Icon } from '@/components/ui/icon';

export type SuggestionView = {
  verb: string;
  jp: string;
  reason: string;
  confidence: number;
  tone: 'primary' | 'secondary' | 'warn' | 'muted' | 'ok';
};

export function deriveSuggestion(inq: {
  status: string;
  confidence: number;
  isUrgent: boolean;
  citationCount: number;
  recommendation: string | null;
}): SuggestionView {
  if (inq.recommendation === 'human_handoff') {
    return {
      verb: 'Escalate',
      jp: '所長へエスカレーション',
      reason: inq.isUrgent
        ? '「税務調査」キーワードと至急フラグ。所長税理士が初動対応を引き継ぐべきです。'
        : `信頼度 ${Math.round(inq.confidence * 100)}% が閾値を下回り、個別判断が必要なため。`,
      confidence: inq.confidence,
      tone: 'warn',
    };
  }
  if (inq.recommendation === 'no_reply_needed') {
    return {
      verb: 'Skip',
      jp: '返信不要',
      reason: 'AI が自動配信または社内通知と判定。返信は不要です。',
      confidence: inq.confidence,
      tone: 'muted',
    };
  }
  if (inq.status === 'sent') {
    return {
      verb: 'Resolved',
      jp: '対応完了',
      reason: 'クライアントは満足したと判定されました。アーカイブ可能です。',
      confidence: 0.92,
      tone: 'ok',
    };
  }
  if (inq.confidence >= 0.85) {
    return {
      verb: 'Send as-is',
      jp: '下書きそのまま送信',
      reason: `KB ${inq.citationCount}件と過去同種対応にマッチ。署名と本文に修正不要箇所はありません。`,
      confidence: inq.confidence,
      tone: 'primary',
    };
  }
  return {
    verb: 'Edit & send',
    jp: '編集して送信',
    reason: '下書きは概ね正確ですが、署名行と日付の最終確認を推奨します。',
    confidence: inq.confidence,
    tone: 'secondary',
  };
}

export function SuggestedActionCard({ suggestion }: { suggestion: SuggestionView }) {
  const s = suggestion;
  return (
    <div className={`suggest suggest-${s.tone}`}>
      <div className="suggest-head">
        <span className="suggest-label">推奨アクション</span>
        <span className="suggest-conf">
          <i style={{ width: `${s.confidence * 100}%` }} />
          {Math.round(s.confidence * 100)}%
        </span>
      </div>
      <div className="suggest-verb">{s.jp}</div>
      <div className="suggest-reason">{s.reason}</div>
      <div className="suggest-actions">
        <button type="button" className="btn btn-secondary">
          <Icon name="more" size={11} /> 別案
        </button>
        <button type="button" className="btn btn-primary">
          <Icon name="arrow-right" size={11} /> {s.jp}
        </button>
      </div>
    </div>
  );
}
