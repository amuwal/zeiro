import { createTool } from '@mastra/core/tools';
import { TenantIsolationError } from '@zeiro/core/errors';
import { listReceivedDocuments } from '@zeiro/db';
import { z } from 'zod';

const outputSchema = z.object({
  documents: z.array(
    z.object({
      filename: z.string(),
      kind: z.string().nullable(),
      inquirySubject: z.string(),
      receivedAt: z.string(),
    }),
  ),
});

// Lets the agent answer "did you receive my 領収書 / 書類?" with a grounded fact —
// the list of documents this 顧問先 has actually sent (parsed inbound attachments).
export const listReceivedDocumentsTool = createTool({
  id: 'list-received-documents',
  description:
    'この顧問先から受領済みの書類 (添付ファイル) の一覧を返す。「送った書類は届いていますか」「○○は受け取りましたか」等の受領確認の問い合わせで呼ぶ。返ってきたファイルのみを「受領済み」と断定し、一覧に無いものは「確認できておりません」と書いて担当者確認を促すこと (届いていないと断定しない)。',
  inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
  outputSchema,
  execute: async (input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('list-received-documents invoked without firmId');
    }
    if (typeof clientId !== 'string') return { documents: [] };
    const documents = await listReceivedDocuments(firmId, clientId, input.limit ?? 20);
    return { documents };
  },
});
