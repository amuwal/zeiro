'use client';

import type { ChatMessage, ChatPart } from '@zeiro/core';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';

export function ChatMessageView({ message }: { message: ChatMessage }) {
  return (
    <div className={`sc-chat-msg ${message.role}`}>
      <div className="sc-chat-msg-role">
        {message.role === 'user' ? 'あなた' : 'エージェント'}
      </div>
      <div className="sc-chat-msg-parts">
        {message.parts.map((p, i) => (
          <PartView key={i} part={p} />
        ))}
        {message.role === 'assistant' && message.parts.length === 0 && (
          <span className="sc-chat-thinking">考え中…</span>
        )}
      </div>
    </div>
  );
}

function PartView({ part }: { part: ChatPart }) {
  if (part.type === 'text') {
    return <div className="sc-chat-msg-text">{part.text}</div>;
  }
  if (part.type === 'reasoning') {
    return <ReasoningPart text={part.text} />;
  }
  return <ToolCallPart part={part} />;
}

function ReasoningPart({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`sc-chat-reasoning ${open ? 'open' : ''}`}>
      <button type="button" className="sc-chat-reasoning-head" onClick={() => setOpen((v) => !v)}>
        <Icon name="spark" size={11} />
        <span>推論</span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={11} />
      </button>
      {open && <div className="sc-chat-reasoning-body">{text}</div>}
    </div>
  );
}

function ToolCallPart({
  part,
}: {
  part: Extract<ChatPart, { type: 'tool-call' }>;
}) {
  const [open, setOpen] = useState(false);
  const status: 'running' | 'done' | 'error' = part.error
    ? 'error'
    : part.output === undefined
      ? 'running'
      : 'done';
  return (
    <div className={`sc-chat-tool ${status}`}>
      <button type="button" className="sc-chat-tool-head" onClick={() => setOpen((v) => !v)}>
        <span className="sc-chat-tool-name">
          <Icon name="spark" size={10} />
          {part.name}
        </span>
        <span className={`sc-chat-tool-status status-${status}`}>
          {status === 'running' && <span className="sc-chat-tool-dot" />}
          {status === 'running' ? '実行中' : status === 'error' ? 'エラー' : '完了'}
        </span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={11} />
      </button>
      {open && (
        <div className="sc-chat-tool-body">
          {part.input !== undefined && (
            <div className="sc-chat-tool-section">
              <div className="sc-chat-tool-label">INPUT</div>
              <pre>{stringify(part.input)}</pre>
            </div>
          )}
          {part.output !== undefined && (
            <div className="sc-chat-tool-section">
              <div className="sc-chat-tool-label">OUTPUT</div>
              <pre>{stringify(part.output)}</pre>
            </div>
          )}
          {part.error && (
            <div className="sc-chat-tool-section">
              <div className="sc-chat-tool-label error">ERROR</div>
              <pre>{part.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
