'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { type Turn, TurnView } from './turns';

type Props = {
  meta: {
    id: string;
    subject: string;
    senderName: string;
    senderRole: string;
    senderCompany: string;
    senderInitials: string;
    category: string;
  };
  turns: Turn[];
};

const CATEGORY_JP: Record<string, string> = {
  deadline: '期日確認',
  docs: '書類提出',
  tax: '税務質問',
  contract: '顧問契約',
  other: 'その他',
};

export function ThreadV2({ meta, turns }: Props) {
  const [highlightedCite, setHighlightedCite] = useState<string | null>(null);
  const cat = CATEGORY_JP[meta.category] ?? meta.category;
  return (
    <section className="thread-col">
      <div className="thread-head">
        <div className="thread-crumbs">
          <span>受信トレイ</span>
          <span className="sep">/</span>
          <b>{cat}</b>
          <span className="id">INQ-{meta.id.slice(0, 8).toUpperCase()}</span>
          <div className="actions">
            <button type="button" className="icon-btn-sm" title="アーカイブ"><Icon name="archive" size={14} /></button>
            <button type="button" className="icon-btn-sm" title="その他"><Icon name="more" size={14} /></button>
          </div>
        </div>

        <h1 className="thread-subject">{meta.subject}</h1>

        <div className="thread-meta">
          <div className="thread-from">
            <span className="pic">{meta.senderInitials}</span>
            <span className="who">{meta.senderName}</span>
            {meta.senderRole && (
              <>
                <span className="sep">/</span>
                <span>{meta.senderRole}</span>
              </>
            )}
            {meta.senderCompany && meta.senderCompany !== meta.senderName && (
              <>
                <span className="sep">/</span>
                <span>{meta.senderCompany}</span>
              </>
            )}
          </div>
          <span className="thread-tag">
            <span className="swatch" />
            {cat}
          </span>
        </div>
      </div>

      <div className="thread-body">
        {turns.map((t, i) => (
          <TurnView
            key={i}
            turn={t}
            highlightedCite={highlightedCite}
            onCiteHover={setHighlightedCite}
            onCiteLeave={() => setHighlightedCite(null)}
          />
        ))}
      </div>

      <div className="composer">
        <div className="composer-suggestions">
          {['そのまま送信', '編集して送信', '却下', '所長に転送'].map((s) => (
            <button key={s} type="button" className="sugg-chip">
              <span className="ico"><Icon name="spark" size={11} /></span>
              {s}
            </button>
          ))}
        </div>
        <div className="composer-box">
          <textarea className="composer-input" placeholder="顧問先への返信を入力…" rows={1} />
          <div className="composer-actions">
            <button type="button" className="icon-btn-sm" title="添付"><Icon name="paperclip" size={14} /></button>
            <button type="button" className="icon-btn-sm" title="ナレッジ参照"><Icon name="book" size={14} /></button>
            <button type="button" className="btn btn-primary">
              <Icon name="send" size={12} /> 送信
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
        <div className="composer-meta">
          <div className="group">
            <span className="item"><Icon name="shield" size={11} /> <b>テナント分離</b> 有効</span>
            <span className="item"><Icon name="clock" size={11} /> 一次対応 <b>—</b></span>
          </div>
          <span className="item">監査ログ <b>記録中</b></span>
        </div>
      </div>
    </section>
  );
}
