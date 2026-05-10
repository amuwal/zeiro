import type { InquiryHeaders } from '@zeiro/core';

export type OutboundThread = {
  messageId: string;
  inReplyTo: string;
  references: string[];
};

type Input = {
  inquiryMessageId: string;
  inquiryReferences: string[];
  draftId: string;
  outboundDomain: string;
};

export function buildOutboundThread(input: Input): OutboundThread {
  return {
    messageId: `${input.draftId}@${input.outboundDomain}`,
    inReplyTo: input.inquiryMessageId,
    references: [...input.inquiryReferences, input.inquiryMessageId].filter(Boolean),
  };
}

export function ensureRePrefix(subject: string): string {
  const trimmed = subject.trim();
  if (/^re:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}

export function readInquiryReferences(headers: unknown): string[] {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return [];
  const refs = (headers as Partial<InquiryHeaders>).references;
  return Array.isArray(refs) ? refs.filter((r): r is string => typeof r === 'string') : [];
}
