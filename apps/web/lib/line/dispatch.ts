import { getFirmChannel } from '@zeiro/db';
import { parseLineConfig } from './parse';
import { sendLinePush } from './send';

type Input = {
  firmId: string;
  draftId: string;
  lineUserId: string;
  body: string;
};

export type LineDispatchResult = {
  outboundMessageId: string;
  providerMetadata: Record<string, unknown>;
};

export async function dispatchLine(input: Input): Promise<LineDispatchResult> {
  const channel = await getFirmChannel(input.firmId, 'line');
  if (!channel?.enabled) {
    throw new Error(`firm ${input.firmId} has no enabled LINE channel`);
  }
  const config = parseLineConfig(channel.config);
  if (!config) {
    throw new Error(`firm ${input.firmId} LINE channel config invalid`);
  }
  const result = await sendLinePush({
    accessToken: config.channelAccessToken,
    to: input.lineUserId,
    text: input.body,
  });
  return {
    outboundMessageId: `line:${input.draftId}:${result.requestId}`,
    providerMetadata: { lineRequestId: result.requestId },
  };
}
