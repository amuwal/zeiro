'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/icon';
import { sendTestInquiryAction } from './test-inquiry-action';

// Sends a sample inquiry through the live pipeline and jumps to it — the draft
// streams in via the detail page's poller, so a new firm sees the product work
// end-to-end in one click.
export function TestInquiryButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink shadow-sm transition hover:opacity-90 disabled:opacity-60"
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const { inquiryId } = await sendTestInquiryAction();
              router.push(`/inbox/${inquiryId}`);
            } catch {
              setError('テスト問い合わせの送信に失敗しました。');
            }
          })
        }
      >
        <Icon name="spark" size={14} />
        {pending ? 'AIが下書きを作成中…' : 'テスト問い合わせを送って試す'}
      </button>
      {error && <span className="text-[12px] text-urgent">{error}</span>}
    </div>
  );
}
