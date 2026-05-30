import { registerAdapter } from '../../core/registry';
import { ChatworkAdapter } from './adapter';

export { ChatworkAdapter } from './adapter';
export { ChatworkApiClient } from './api-client';

let registered = false;

export function registerChatwork(args: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): ChatworkAdapter {
  const adapter = new ChatworkAdapter(args);
  registerAdapter(adapter);
  registered = true;
  return adapter;
}

export function isChatworkRegistered(): boolean {
  return registered;
}
