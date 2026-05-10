import sgMail from '@sendgrid/mail';

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
  customArgs?: Record<string, string>;
};

export type SendResult = {
  outboundMessageId: string;
  sgMessageId: string | null;
};

export async function sendReply(input: SendInput): Promise<SendResult> {
  sgMail.setApiKey(input.apiKey);

  const headers: Record<string, string> = {
    'Message-ID': bracket(input.messageId),
    'In-Reply-To': bracket(input.inReplyTo),
  };
  if (input.references.length > 0) {
    headers.References = input.references.map(bracket).join(' ');
  }

  const [response] = await sgMail.send({
    to: input.to,
    from: input.from,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    subject: input.subject,
    text: input.body,
    headers,
    customArgs: input.customArgs ?? {},
  });

  const sgMessageId = response.headers['x-message-id'];
  return {
    outboundMessageId: input.messageId,
    sgMessageId: typeof sgMessageId === 'string' ? sgMessageId : null,
  };
}

function bracket(id: string): string {
  return id.startsWith('<') ? id : `<${id}>`;
}
