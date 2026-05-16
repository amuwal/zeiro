'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  ts: string;
};

export function ChatTab({ inquiryId: _inquiryId }: { inquiryId: string }) {
  const [messages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  return (
    <div className="sc-pane sc-chat">
      <div className="sc-chat-stream">
        {messages.length === 0 && (
          <div className="sc-chat-empty">
            <div className="sc-chat-empty-title">エージェントと対話</div>
            <div className="sc-chat-empty-sub">
              下書きの理由を確認したり、citations の詳細を尋ねたり、freee から最新の取引データを取得するよう依頼できます。
            </div>
            <div className="sc-chat-empty-chips">
              <button type="button" className="sugg-chip">なぜこの回答?</button>
              <button type="button" className="sugg-chip">freee で確認</button>
              <button type="button" className="sugg-chip">代替案を提示</button>
              <button type="button" className="sugg-chip">もっと簡潔に</button>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatTurn key={m.id} message={m} />
        ))}
      </div>
      <form
        className="sc-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          setDraft('');
        }}
      >
        <textarea
          className="sc-chat-input"
          placeholder="エージェントに質問・指示…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
        />
        <button type="submit" className="sc-chat-send" disabled={draft.trim() === ''}>
          <Icon name="send" size={12} />
        </button>
      </form>
    </div>
  );
}

function ChatTurn({ message }: { message: Message }) {
  if (message.role === 'tool') {
    return (
      <div className="sc-chat-tool">
        <span className="sc-chat-tool-pill">
          <Icon name="spark" size={10} /> {message.toolName ?? 'tool'}
        </span>
        <span className="sc-chat-tool-content">{message.content}</span>
      </div>
    );
  }
  return (
    <div className={`sc-chat-msg ${message.role}`}>
      <div className="sc-chat-msg-role">
        {message.role === 'user' ? 'あなた' : 'エージェント'}
      </div>
      <div className="sc-chat-msg-body">{message.content}</div>
      <div className="sc-chat-msg-time">{message.ts}</div>
    </div>
  );
}
