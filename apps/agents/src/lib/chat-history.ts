import type { ChatMessage, ChatPart } from '@zeiro/core';
import { inquiryAgent } from '../mastra/agents/inquiry.js';

type MastraPart = {
  type: string;
  text?: string;
  reasoning?: string;
  toolInvocation?: {
    toolCallId: string;
    toolName: string;
    args?: unknown;
    state?: 'partial-call' | 'call' | 'result' | 'error';
    result?: unknown;
    errorMessage?: string;
  };
};

type MastraDBMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'signal';
  createdAt: Date;
  content: {
    parts?: MastraPart[];
    content?: string;
  };
};

/**
 * Load prior chat turns for an inquiry's thread and flatten Mastra's nested
 * V2 message parts into our wire-format ChatMessage[]. Tool invocations are
 * emitted as single tool-call parts (their result is already attached, no
 * separate tool-result message needed). System messages are skipped.
 */
export async function loadChatHistory(args: {
  inquiryId: string;
  firmId: string;
}): Promise<ChatMessage[]> {
  const memory = await inquiryAgent.getMemory();
  if (!memory) return [];

  // A fresh inquiry that hasn't been chatted with has no thread yet — recall
  // throws "No thread found" in that case. Treat it as empty history.
  const thread = await memory.getThreadById({ threadId: args.inquiryId });
  if (!thread) return [];

  const result = await memory.recall({
    threadId: args.inquiryId,
    resourceId: args.firmId,
    perPage: 200,
  });

  const out: ChatMessage[] = [];
  for (const m of result.messages as MastraDBMessage[]) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const parts = normalizeParts(m.content.parts ?? [], m.content.content);
    if (parts.length === 0) continue;
    out.push({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      parts,
    });
  }
  return out;
}

function normalizeParts(parts: MastraPart[], fallbackText: string | undefined): ChatPart[] {
  const out: ChatPart[] = [];
  for (const p of parts) {
    if (p.type === 'text' && typeof p.text === 'string' && p.text.length > 0) {
      out.push({ type: 'text', text: p.text });
    } else if (p.type === 'reasoning' && typeof p.reasoning === 'string' && p.reasoning.length > 0) {
      out.push({ type: 'reasoning', text: p.reasoning });
    } else if (p.type === 'tool-invocation' && p.toolInvocation) {
      const ti = p.toolInvocation;
      out.push({
        type: 'tool-call',
        callId: ti.toolCallId,
        name: ti.toolName,
        input: ti.args,
        output: ti.state === 'result' ? ti.result : undefined,
        error: ti.state === 'error' ? ti.errorMessage : undefined,
      });
    }
  }
  if (out.length === 0 && typeof fallbackText === 'string' && fallbackText.length > 0) {
    out.push({ type: 'text', text: fallbackText });
  }
  return out;
}
