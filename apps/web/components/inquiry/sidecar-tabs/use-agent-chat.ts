'use client';

import type { ChatMessage, ChatPart, ChatStreamEvent } from '@zeiro/core';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'loading' | 'streaming' | 'error';

export function useAgentChat(inquiryId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Load prior turns once the inquiry changes.
  useEffect(() => {
    setMessages([]);
    setError(null);
    setStatus('loading');
    let cancelled = false;
    fetch(`/api/inquiries/${inquiryId}/chat`)
      .then((r) => r.json())
      .then((j: { messages?: ChatMessage[] }) => {
        if (cancelled) return;
        setMessages(j.messages ?? []);
        setStatus('idle');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'failed to load history');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  // Background refresh — used by ChatTab to poll while the inquiry is still
  // in `pending` (pipeline hasn't written any agent turns yet).
  const refetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`/api/inquiries/${inquiryId}/chat`);
      const j: { messages?: ChatMessage[] } = await r.json();
      setMessages(j.messages ?? []);
    } catch {
      // Silent — periodic refresh shouldn't surface errors mid-poll.
    }
  }, [inquiryId]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        createdAt: new Date().toISOString(),
        parts: [{ type: 'text', text: trimmed }],
      };
      const placeholderId = `a-${Date.now()}`;
      const placeholder: ChatMessage = {
        id: placeholderId,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        parts: [],
      };
      setMessages((prev) => [...prev, userMessage, placeholder]);
      setStatus('streaming');
      setError(null);

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(`/api/inquiries/${inquiryId}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`agent stream ${res.status}`);
        }
        let needsRefresh = false;
        await readSSE(res.body, (ev) => {
          if (ev.type === 'state-changed') {
            needsRefresh = true;
            return;
          }
          setMessages((prev) => applyStreamEvent(prev, placeholderId, ev));
        });
        setStatus('idle');
        // Re-fetch the inquiry server component so the draft composer + status
        // pill pick up the new persisted draft / status.
        if (needsRefresh) router.refresh();
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'chat failed');
        setStatus('error');
      }
    },
    [inquiryId],
  );

  return { messages, status, error, send, refetchHistory };
}

async function readSSE(body: ReadableStream<Uint8Array>, onEvent: (ev: ChatStreamEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    // SSE frames are split by blank lines (`\n\n`)
    while ((nl = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(5).trim()) as ChatStreamEvent);
      } catch {
        // ignore malformed frame
      }
    }
  }
}

function applyStreamEvent(prev: ChatMessage[], assistantId: string, ev: ChatStreamEvent): ChatMessage[] {
  const idx = prev.findIndex((m) => m.id === assistantId);
  if (idx === -1) return prev;
  const msg = prev[idx]!;
  const next = updateAssistant(msg, ev);
  if (next === msg) return prev;
  const copy = prev.slice();
  copy[idx] = next;
  return copy;
}

function updateAssistant(msg: ChatMessage, ev: ChatStreamEvent): ChatMessage {
  const parts = msg.parts.slice();
  const last = parts[parts.length - 1];

  switch (ev.type) {
    case 'text-delta':
      if (last && last.type === 'text') {
        parts[parts.length - 1] = { type: 'text', text: last.text + ev.delta };
      } else {
        parts.push({ type: 'text', text: ev.delta });
      }
      return { ...msg, parts };
    case 'reasoning-delta':
      if (last && last.type === 'reasoning') {
        parts[parts.length - 1] = { type: 'reasoning', text: last.text + ev.delta };
      } else {
        parts.push({ type: 'reasoning', text: ev.delta });
      }
      return { ...msg, parts };
    case 'tool-call':
      parts.push({
        type: 'tool-call',
        callId: ev.callId,
        name: ev.name,
        input: ev.input,
      });
      return { ...msg, parts };
    case 'tool-result': {
      const tIdx = findToolCall(parts, ev.callId);
      if (tIdx === -1) return msg;
      const existing = parts[tIdx] as Extract<ChatPart, { type: 'tool-call' }>;
      parts[tIdx] = { ...existing, output: ev.output, error: ev.error };
      return { ...msg, parts };
    }
    case 'text-end':
    case 'reasoning-end':
    case 'done':
    case 'error':
    case 'state-changed':
      return msg;
  }
}

function findToolCall(parts: ChatPart[], callId: string): number {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]!;
    if (p.type === 'tool-call' && p.callId === callId) return i;
  }
  return -1;
}
