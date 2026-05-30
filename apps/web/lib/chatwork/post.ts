const CHATWORK_API = 'https://api.chatwork.com/v2';

// Posts a message to a Chatwork room. Returns the new message_id (empty string
// if Chatwork omits it). Token auth via X-ChatWorkToken; body is form-encoded.
// https://developer.chatwork.com/docs
export async function postChatworkMessage(
  apiToken: string,
  roomId: string,
  body: string,
): Promise<string> {
  const res = await fetch(`${CHATWORK_API}/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': apiToken,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: new URLSearchParams({ body }).toString(),
  });
  if (!res.ok) {
    throw new Error(`chatwork POST messages → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { message_id?: string };
  return json.message_id ?? '';
}
