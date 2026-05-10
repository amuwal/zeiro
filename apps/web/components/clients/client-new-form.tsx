'use client';

import { useActionState } from 'react';
import { createClientAction } from '@/app/(app)/clients/actions';
import { initialClientFormState } from '@/app/(app)/clients/state';
import { CONTRACT_OPTIONS } from './contract-labels';

type Props = {
  users: { id: string; name: string }[];
  prefill: {
    name: string;
    primaryEmail: string;
    sourceHint: string | null;
    promoteInquiryId: string | null;
  };
};

export function ClientNewForm({ users, prefill }: Props) {
  const [state, action, pending] = useActionState(createClientAction, initialClientFormState);
  const fieldErrors = state.status === 'error' ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="cl-section">
      {prefill.promoteInquiryId && (
        <input type="hidden" name="promoteInquiryId" value={prefill.promoteInquiryId} />
      )}
      <div className="cl-section-title">
        {prefill.promoteInquiryId ? '送信元を顧問先として登録' : '基本情報'}
      </div>

      <div className="cl-form">
        <div className="cl-field">
          <label htmlFor="cl-name">名前 / 法人名</label>
          <input
            id="cl-name"
            name="name"
            required
            defaultValue={prefill.name}
            placeholder="株式会社山田商事"
          />
          {fieldErrors.name && <div className="cl-field-error">{fieldErrors.name}</div>}
        </div>

        <div className="cl-field">
          <label htmlFor="cl-email">メールアドレス</label>
          <input
            id="cl-email"
            name="primaryEmail"
            type="email"
            required
            defaultValue={prefill.primaryEmail}
            placeholder="contact@example.co.jp"
          />
          {fieldErrors.primaryEmail && (
            <div className="cl-field-error">{fieldErrors.primaryEmail}</div>
          )}
          <div className="cl-field-hint">
            このアドレスから届く問い合わせを自動でこの顧問先に紐付けます
          </div>
        </div>

        <div className="cl-field">
          <label htmlFor="cl-contract">契約形態</label>
          <select id="cl-contract" name="contractType" defaultValue="monthly">
            {CONTRACT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor="cl-assignee">担当者 (任意)</label>
          <select id="cl-assignee" name="assignedTaxAccountantId" defaultValue="">
            <option value="">未設定</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="cl-field full">
          <label htmlFor="cl-notes">メモ (任意)</label>
          <textarea
            id="cl-notes"
            name="notes"
            rows={3}
            placeholder="決算月、契約開始日、優先度などの内部メモ"
          />
        </div>
      </div>

      <div className="cl-form-row">
        {state.status === 'error' && <div className="cl-form-message error">{state.message}</div>}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '登録中…' : prefill.promoteInquiryId ? '登録して下書き生成' : '顧問先を登録'}
        </button>
      </div>
    </form>
  );
}
