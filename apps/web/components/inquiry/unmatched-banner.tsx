'use client';

import { useState, useTransition } from 'react';
import { promoteUnmatchedAction, rejectUnmatchedAction } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  inquiryId: string;
  fromAddress: string;
  /** Suggested display name — usually the email's local part or what the
   * sender used in the From header. The user can override before promoting. */
  suggestedName: string;
};

const CONTRACT_OPTIONS = [
  { value: 'monthly', label: '顧問契約 (月次)' },
  { value: 'spot', label: '単発' },
  { value: 'prospect', label: '見込み' },
  { value: 'unverified', label: '未確認' },
] as const;

export function UnmatchedBanner({ inquiryId, fromAddress, suggestedName }: Props) {
  const [name, setName] = useState(suggestedName);
  const [contractType, setContractType] =
    useState<(typeof CONTRACT_OPTIONS)[number]['value']>('unverified');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const promote = () => {
    setError(null);
    startTransition(() => {
      promoteUnmatchedAction(inquiryId, name, contractType).catch((e) =>
        setError(e instanceof Error ? e.message : 'promote failed'),
      );
    });
  };
  const reject = () => {
    setError(null);
    startTransition(() => {
      rejectUnmatchedAction(inquiryId).catch((e) =>
        setError(e instanceof Error ? e.message : 'reject failed'),
      );
    });
  };

  return (
    <div className="unmatched-banner">
      <div className="unmatched-banner-head">
        <Icon name="alert" size={13} />
        <div>
          <div className="unmatched-banner-title">未登録の差出人からの問い合わせ</div>
          <div className="unmatched-banner-sub">
            <code>{fromAddress}</code> は顧問先として未登録です。登録すると AI
            下書きが生成されます。
          </div>
        </div>
      </div>
      <div className="unmatched-banner-form">
        <label className="unmatched-banner-field">
          <span>顧問先名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="例：株式会社サンプル"
          />
        </label>
        <label className="unmatched-banner-field">
          <span>契約種別</span>
          <select
            value={contractType}
            onChange={(e) =>
              setContractType(e.target.value as (typeof CONTRACT_OPTIONS)[number]['value'])
            }
            disabled={busy}
          >
            {CONTRACT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="unmatched-banner-actions">
          <button type="button" className="btn btn-ghost" onClick={reject} disabled={busy}>
            <Icon name="x" size={12} /> 破棄
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={promote}
            disabled={busy || name.trim().length === 0}
          >
            <Icon name="check" size={12} /> 顧問先として登録
          </button>
        </div>
      </div>
      {error && (
        <div className="unmatched-banner-error">
          <Icon name="alert" size={11} /> {error}
        </div>
      )}
    </div>
  );
}
