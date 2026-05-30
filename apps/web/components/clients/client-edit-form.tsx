'use client';

import type { ClientDetail } from '@zeiro/db';
import { useActionState, useEffect, useState } from 'react';
import { updateClientAction } from '@/app/(app)/clients/actions';
import { initialClientFormState } from '@/app/(app)/clients/state';
import { CONTRACT_OPTIONS } from './contract-labels';

type Props = {
  client: ClientDetail;
  users: { id: string; name: string }[];
};

function boolToSelect(v: boolean | null | undefined): string {
  if (v === true) return 'true';
  if (v === false) return 'false';
  return '';
}

export function ClientEditForm({ client, users }: Props) {
  const profile = client.profile ?? {};
  const [state, action, pending] = useActionState(updateClientAction, initialClientFormState);
  const fieldErrors = state.status === 'error' ? (state.fieldErrors ?? {}) : {};
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (state.status === 'success') setSavedAt(Date.now());
  }, [state]);
  const justSaved = savedAt !== null && Date.now() - savedAt < 4000;

  return (
    <form action={action} className="cl-section">
      <input type="hidden" name="clientId" value={client.id} />
      <div className="cl-section-title">基本情報</div>

      <div className="cl-form">
        <div className="cl-field">
          <label htmlFor={`cl-name-${client.id}`}>名前 / 法人名</label>
          <input id={`cl-name-${client.id}`} name="name" required defaultValue={client.name} />
          {fieldErrors.name && <div className="cl-field-error">{fieldErrors.name}</div>}
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-email-${client.id}`}>メールアドレス</label>
          <input id={`cl-email-${client.id}`} value={client.primaryEmail} disabled />
          <div className="cl-field-hint">
            メールアドレスは変更できません。新しいアドレスは別の顧問先として登録してください。
          </div>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-contract-${client.id}`}>契約形態</label>
          <select
            id={`cl-contract-${client.id}`}
            name="contractType"
            defaultValue={client.contractType}
          >
            {CONTRACT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-assignee-${client.id}`}>担当者</label>
          <select
            id={`cl-assignee-${client.id}`}
            name="assignedTaxAccountantId"
            defaultValue={client.assignedToId ?? ''}
          >
            <option value="">未設定</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="cl-field full">
          <label htmlFor={`cl-notes-${client.id}`}>メモ</label>
          <textarea
            id={`cl-notes-${client.id}`}
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ''}
          />
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-cw-${client.id}`}>Chatwork ルームID</label>
          <input
            id={`cl-cw-${client.id}`}
            name="chatworkRoomId"
            defaultValue={client.chatworkRoomId ?? ''}
            placeholder="この顧問先の Chatwork ルーム (任意)"
          />
        </div>
      </div>

      <div className="cl-section-title">税務プロフィール</div>
      <div className="cl-field-hint">
        AI
        が期日・料金・税務手続きの前提を踏まえた下書きを作るための情報です。分かる範囲で設定してください。
      </div>

      <div className="cl-form">
        <div className="cl-field">
          <label htmlFor={`cl-fy-${client.id}`}>決算月</label>
          <select
            id={`cl-fy-${client.id}`}
            name="fiscalMonth"
            defaultValue={profile.fiscalMonth ?? ''}
          >
            <option value="">未設定</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-entity-${client.id}`}>事業形態</label>
          <select
            id={`cl-entity-${client.id}`}
            name="entityType"
            defaultValue={profile.entityType ?? ''}
          >
            <option value="">未設定</option>
            <option value="corporation">法人</option>
            <option value="sole_proprietor">個人事業主</option>
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-ctax-${client.id}`}>消費税</label>
          <select
            id={`cl-ctax-${client.id}`}
            name="consumptionTax"
            defaultValue={profile.consumptionTax ?? ''}
          >
            <option value="">未設定</option>
            <option value="taxable">課税事業者</option>
            <option value="simplified">簡易課税</option>
            <option value="exempt">免税事業者</option>
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-inv-${client.id}`}>インボイス登録</label>
          <select
            id={`cl-inv-${client.id}`}
            name="invoiceRegistered"
            defaultValue={boolToSelect(profile.invoiceRegistered)}
          >
            <option value="">未設定</option>
            <option value="true">登録済</option>
            <option value="false">未登録</option>
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-wh-${client.id}`}>源泉徴収義務</label>
          <select
            id={`cl-wh-${client.id}`}
            name="withholding"
            defaultValue={boolToSelect(profile.withholding)}
          >
            <option value="">未設定</option>
            <option value="true">あり</option>
            <option value="false">なし</option>
          </select>
        </div>

        <div className="cl-field">
          <label htmlFor={`cl-fee-${client.id}`}>顧問料 (月額・円)</label>
          <input
            id={`cl-fee-${client.id}`}
            name="monthlyFee"
            type="number"
            min={0}
            defaultValue={profile.monthlyFee ?? ''}
            placeholder="例: 30000"
          />
        </div>

        <div className="cl-field full">
          <label htmlFor={`cl-scope-${client.id}`}>契約範囲</label>
          <input
            id={`cl-scope-${client.id}`}
            name="engagementScope"
            defaultValue={profile.engagementScope ?? ''}
            placeholder="例: 記帳代行・法人税申告・年末調整"
          />
        </div>
      </div>

      <div className="cl-form-row">
        {state.status === 'error' && <div className="cl-form-message error">{state.message}</div>}
        {justSaved && state.status === 'success' && (
          <div className="cl-form-message success">保存しました</div>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '保存中…' : '変更を保存'}
        </button>
      </div>
    </form>
  );
}
