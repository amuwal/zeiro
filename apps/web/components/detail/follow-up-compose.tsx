'use client';

import { useState } from 'react';
import { sendFollowUp } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Variant = 'follow_up' | 'manual';

const LABELS: Record<
  Variant,
  { trigger: string; heading: string; placeholder: string; hint: string; cta: string }
> = {
  follow_up: {
    trigger: 'フォローアップを送信',
    heading: 'フォローアップ送信',
    placeholder: 'お客様へのフォローアップメッセージを入力してください…',
    hint: '同じスレッドに送信されます。お客様には「Re: 元の件名」として届きます。',
    cta: '送信',
  },
  manual: {
    trigger: '手動で返信を作成',
    heading: '手動返信',
    placeholder:
      'AI 判定や不明点を踏まえて、返信内容を入力してください。\n見出しは「■ 〜について」、リストは「・」「①②③」を使うと読みやすくなります。',
    hint: 'AI 下書きが生成されなかったため、内容を手動で作成して送信します。',
    cta: '返信を送信',
  },
};

type Props = {
  inquiryId: string;
  variant?: Variant;
};

export function FollowUpCompose({ inquiryId, variant = 'follow_up' }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const labels = LABELS[variant];

  if (!open) {
    return (
      <button
        type="button"
        className={`follow-up-trigger ${variant === 'manual' ? 'manual' : ''}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="edit" size={13} />
        {labels.trigger}
      </button>
    );
  }

  return (
    <form
      className="follow-up-form"
      action={async (formData) => {
        setPending(true);
        try {
          await sendFollowUp(formData);
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <div className="follow-up-head">
        <span>{labels.heading}</span>
        <button
          type="button"
          className="follow-up-close"
          onClick={() => {
            setOpen(false);
            setBody('');
          }}
          aria-label="閉じる"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
      <textarea
        name="body"
        rows={variant === 'manual' ? 10 : 6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={labels.placeholder}
        required
      />
      <div className="follow-up-row">
        <span className="follow-up-hint">{labels.hint}</span>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || body.trim().length === 0}
        >
          <Icon name="send" size={13} />
          {pending ? '送信中…' : labels.cta}
        </button>
      </div>
    </form>
  );
}
