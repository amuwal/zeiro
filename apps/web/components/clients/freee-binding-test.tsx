'use client';

import { useActionState } from 'react';
import {
  type FreeeTestResult,
  testFreeeBinding,
} from '@/app/(app)/clients/[id]/freee-binding-actions';
import { Icon } from '@/components/ui/icon';

const INITIAL: FreeeTestResult = { status: 'idle' };

// Lets an owner verify a client's freee binding points at the right 事業所:
// fetches one recent deal + a few partner names so it can be eyeballed before
// trusting the agent's freee-grounded drafts.
export function FreeeBindingTest({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(testFreeeBinding, INITIAL);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <button
        type="submit"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-bg-2 disabled:opacity-60"
        disabled={pending}
      >
        <Icon name="spark" size={12} /> {pending ? '確認中…' : '接続テスト'}
      </button>
      {state.status === 'ok' && (
        <div className="flex items-start gap-1.5 rounded-sm bg-accent-soft px-2.5 py-2 text-[11px] text-accent-ink">
          <Icon name="check" size={12} /> 接続成功 — 取引先{' '}
          {state.partnerNames.length > 0 ? state.partnerNames.join('、') : '(なし)'}
          {state.sampleDeal
            ? ` / 直近取引 ${state.sampleDeal.date} ¥${state.sampleDeal.amount.toLocaleString('ja-JP')}`
            : ' / 直近取引なし'}
        </div>
      )}
      {state.status === 'error' && (
        <div className="flex items-start gap-1.5 rounded-sm px-2.5 py-2 text-[11px] text-urgent">
          <Icon name="alert" size={12} /> {state.message}
        </div>
      )}
    </form>
  );
}
