import { Resend } from 'resend';

export type SendInput = {
  apiKey: string;
  from: { name: string; email: string };
  replyTo?: { name: string; email: string };
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo: string;
  references: string[];
  tags?: Record<string, string>;
};

export type SendResult = {
  outboundMessageId: string;
  providerMessageId: string | null;
};

export async function sendReply(input: SendInput): Promise<SendResult> {
  const resend = new Resend(input.apiKey);

  const headers: Record<string, string> = {
    'Message-ID': bracket(input.messageId),
    'In-Reply-To': bracket(input.inReplyTo),
  };
  if (input.references.length > 0) {
    headers.References = input.references.map(bracket).join(' ');
  }

  const result = await resend.emails.send({
    from: formatAddress(input.from),
    to: [input.to],
    ...(input.replyTo ? { replyTo: formatAddress(input.replyTo) } : {}),
    subject: input.subject,
    text: input.body,
    headers,
    ...(input.tags ? { tags: toResendTags(input.tags) } : {}),
  });

  if (result.error) {
    throw new Error(`resend send failed: ${result.error.name}: ${result.error.message}`);
  }

  return {
    outboundMessageId: input.messageId,
    providerMessageId: result.data?.id ?? null,
  };
}

function formatAddress(addr: { name: string; email: string }): string {
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

function bracket(id: string): string {
  return id.startsWith('<') ? id : `<${id}>`;
}

function toResendTags(tags: Record<string, string>): { name: string; value: string }[] {
  return Object.entries(tags).map(([name, value]) => ({ name, value }));
}
