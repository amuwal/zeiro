type PushInput = {
  accessToken: string;
  to: string;
  text: string;
};

export type LinePushResult = {
  requestId: string;
};

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function sendLinePush(input: PushInput): Promise<LinePushResult> {
  const response = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.to,
      messages: [{ type: 'text', text: input.text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE push ${response.status}: ${await response.text()}`);
  }
  return { requestId: response.headers.get('x-line-request-id') ?? '' };
}
