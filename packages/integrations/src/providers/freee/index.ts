import { registerAdapter } from '../../core/registry';
import { FreeeAdapter } from './adapter';

export { FreeeAdapter } from './adapter';
export {
  FreeeApiClient,
  type FreeeCompanyMini,
  type FreeeDeal,
  type FreeeInvoice,
  type FreeePartner,
  type FreeeProfitAndLoss,
} from './api-client';

let registered = false;

export function registerFreee(args: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): FreeeAdapter {
  const adapter = new FreeeAdapter(args);
  registerAdapter(adapter);
  registered = true;
  return adapter;
}

export function isFreeeRegistered(): boolean {
  return registered;
}
