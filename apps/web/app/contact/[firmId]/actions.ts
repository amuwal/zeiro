'use server';

import { headers } from 'next/headers';
import { processWebInquiry } from '@/lib/web-form/process';
import type { WebFormState } from './state';

export async function submitContactInquiry(
  firmId: string,
  _prev: WebFormState,
  formData: FormData,
): Promise<WebFormState> {
  if (
    typeof formData.get('website') === 'string' &&
    (formData.get('website') as string).length > 0
  ) {
    return { status: 'success', clientCreated: false };
  }

  const ip = await readIp();
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  };

  const result = await processWebInquiry({ firmId, ip, raw });
  if (result.ok) {
    return { status: 'success', clientCreated: result.clientCreated };
  }

  switch (result.error.kind) {
    case 'firm_not_found':
      return { status: 'error', message: 'お問い合わせ先が見つかりませんでした' };
    case 'channel_disabled':
      return {
        status: 'error',
        message: '現在Webからのお問い合わせは受け付けていません',
      };
    case 'rate_limited': {
      const minutes = Math.ceil(result.error.resetIn / 60_000);
      return {
        status: 'error',
        message: `送信回数の上限に達しました。約${minutes}分後に再度お試しください`,
      };
    }
    case 'invalid':
      return {
        status: 'error',
        message: '入力内容をご確認ください',
        fieldErrors: result.error.fieldErrors,
      };
  }
}

async function readIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip') ?? 'unknown';
}
