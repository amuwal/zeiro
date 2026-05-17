'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { ChatMessageView } from './chat-message';
import { useAgentChat } from './use-agent-chat';

const QUICK_PROMPTS = [
  { label: 'なぜこの回答?', text: 'この下書きの根拠と引用元を詳しく教えてください。' },
  { label: 'freee で確認', text: 'freee の最新の取引データを取得して、回答内容を検証してください。' },
  { label: '代替案を提示', text: '別の言い回しで2案、簡潔と丁寧の対比でください。' },
  { label: 'もっと簡潔に', text: '下書きを2/3程度の長さに簡潔化してください。' },
];

export function ChatTab({
  inquiryId,
  inquiryStatus,
}: {
  inquiryId: string;
  inquiryStatus: string;
}) {
  const { messages, status, error, send, refetchHistory } = useAgentChat(inquiryId);
  const [draft, setDraft] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  const streamEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ta.current) return;
    ta.current.style.height = 'auto';
    ta.current.style.height = `${Math.min(ta.current.scrollHeight, 180)}px`;
  }, [draft]);

  useEffect(() => {
    streamEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // While the inquiry is still `pending` and we haven't received any agent
  // turns yet, poll the history endpoint. Pipeline writes land via Inngest
  // out-of-band, so the user could be looking at the chat panel before the
  // first turn lands. Polling stops automatically once messages arrive (the
  // condition flips), and is bypassed entirely while the user is actively
  // streaming a chat turn.
  const isAwaitingPipeline =
    inquiryStatus === 'pending' && messages.length === 0 && status === 'idle';
  useEffect(() => {
    if (!isAwaitingPipeline) return;
    const id = setInterval(refetchHistory, 3000);
    return () => clearInterval(id);
  }, [isAwaitingPipeline, refetchHistory]);

  const submit = () => {
    if (status === 'streaming' || !draft.trim()) return;
    send(draft);
    setDraft('');
  };

  const isEmpty = messages.length === 0 && status !== 'loading';

  return (
    <div className="sc-chat">
      <div className="sc-chat-stream">
        {status === 'loading' && (
          <div className="sc-chat-empty">
            <div className="sc-chat-empty-sub">履歴を読み込み中…</div>
          </div>
        )}
        {isAwaitingPipeline && (
          <div className="sc-chat-empty">
            <div className="sc-chat-empty-glyph pulsing">
              <Icon name="spark" size={18} />
            </div>
            <div className="sc-chat-empty-title">AIが処理中です…</div>
            <p className="sc-chat-empty-sub">
              新しい問い合わせを受信しました。エージェントが顧客情報・ナレッジを取得し、下書きを生成しています。
            </p>
          </div>
        )}
        {isEmpty && !isAwaitingPipeline && (
          <div className="sc-chat-empty">
            <div className="sc-chat-empty-glyph"><Icon name="spark" size={18} /></div>
            <div className="sc-chat-empty-title">エージェントと対話</div>
            <p className="sc-chat-empty-sub">
              下書きの根拠、citations、freee の最新データなどを聞けます。
            </p>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageView key={m.id} message={m} />
        ))}
        {error && (
          <div className="sc-chat-error">
            <Icon name="alert" size={11} /> {error}
          </div>
        )}
        <div ref={streamEnd} />
      </div>

      <div className="sc-chat-composer">
        <div className="sc-chat-quick">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.label}
              type="button"
              className="sc-chat-quick-chip"
              onClick={() => setDraft(q.text)}
              disabled={status === 'streaming'}
            >
              <Icon name="spark" size={11} /> {q.label}
            </button>
          ))}
        </div>
        <form
          className="sc-chat-input-box"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={ta}
            className="sc-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="エージェントに質問・指示…"
            rows={2}
            disabled={status === 'streaming'}
          />
          <div className="sc-chat-input-foot">
            <span className="sc-chat-shortcut">
              {status === 'streaming' ? '応答中…' : '⌘↵ で送信'}
            </span>
            <button
              type="submit"
              className="sc-chat-send"
              disabled={!draft.trim() || status === 'streaming'}
            >
              <Icon name="send" size={12} /> 送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
