import { getAdapter } from '../../core/registry';

const CHATWORK_API = 'https://api.chatwork.com/v2';

// Outbound Chatwork API via the firm's OAuth token (resolved + auto-refreshed by
// the adapter). Replaces the manually-pasted API token for posting drafts back.
export class ChatworkApiClient {
  static async postMessage(firmId: string, roomId: string, body: string): Promise<string> {
    const token = await getAdapter('chatwork').getAccessToken(firmId);
    const res = await fetch(`${CHATWORK_API}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({ body }).toString(),
    });
    if (!res.ok) {
      throw new Error(
        `chatwork POST messages → ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const json = (await res.json()) as { message_id?: string };
    return json.message_id ?? '';
  }
}
