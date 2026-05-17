import type { ChunkType } from '@mastra/core/stream';
import type { ChatStreamEvent } from '@zeiro/core';

/** Map a single Mastra `fullStream` chunk to our wire-format event. Returns
 * null for chunks the UI doesn't need (text-start/end markers, response
 * metadata, etc.). */
export function chunkToEvent(chunk: ChunkType): ChatStreamEvent | null {
  switch (chunk.type) {
    case 'text-delta':
      return { type: 'text-delta', delta: chunk.payload.text };
    case 'text-end':
      return { type: 'text-end' };
    case 'reasoning-delta':
      return { type: 'reasoning-delta', delta: chunk.payload.text };
    case 'reasoning-end':
      return { type: 'reasoning-end' };
    case 'tool-call':
      return {
        type: 'tool-call',
        callId: chunk.payload.toolCallId,
        name: chunk.payload.toolName,
        input: chunk.payload.args,
      };
    case 'tool-result':
      return {
        type: 'tool-result',
        callId: chunk.payload.toolCallId,
        output: chunk.payload.result,
      };
    case 'tool-output':
      // Some model providers emit `tool-output` (provider-executed tools, MCP)
      // instead of `tool-result`. Same wire-shape from our UI's perspective.
      return {
        type: 'tool-result',
        callId: chunk.payload.toolCallId,
        output: chunk.payload.output,
      };
    case 'tool-error':
      return {
        type: 'tool-result',
        callId: chunk.payload.toolCallId,
        error: errorMessage(chunk.payload.error),
      };
    case 'error':
      return { type: 'error', message: errorMessage(chunk.payload.error) };
    case 'finish':
      // The writer emits its own terminal `done` after the for-await loop; the
      // model's per-step `finish` would double-emit. Swallow it here.
      return null;
    default:
      return null;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'unknown agent error';
}

export function encodeSSE(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
