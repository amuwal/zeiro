'use client';

import { useActionState } from 'react';
import { archiveClientAction, deleteClientAction } from '@/app/(app)/clients/actions';
import { initialDeleteClientState } from '@/app/(app)/clients/state';

type Props = {
  clientId: string;
  archived: boolean;
  inquiryCount: number;
};

export function ClientDangerZone({ clientId, archived, inquiryCount }: Props) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClientAction,
    initialDeleteClientState,
  );
  const canHardDelete = inquiryCount === 0;

  return (
    <section className="cl-section danger">
      <div className="cl-section-title">危険な操作</div>

      {!archived && (
        <div className="cl-danger-row">
          <div className="cl-danger-copy">
            <span>アーカイブする</span>
            <small>
              一覧から非表示になります。データは保持され、アーカイブ解除でいつでも戻せます。
            </small>
          </div>
          <form action={archiveClientAction}>
            <input type="hidden" name="clientId" value={clientId} />
            <button type="submit" className="btn-danger">
              アーカイブ
            </button>
          </form>
        </div>
      )}

      <div className="cl-danger-row">
        <div className="cl-danger-copy">
          <span>完全に削除する</span>
          <small>
            {canHardDelete
              ? 'この顧問先には問い合わせが紐付いていないため、完全に削除できます。元に戻せません。'
              : `問い合わせが ${inquiryCount} 件あるため完全削除はできません。アーカイブをご利用ください。`}
          </small>
          {deleteState.status === 'error' && (
            <small style={{ color: 'var(--urgent)' }}>{deleteState.message}</small>
          )}
        </div>
        <form action={deleteAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <button type="submit" className="btn-danger" disabled={!canHardDelete || deletePending}>
            {deletePending ? '削除中…' : '削除'}
          </button>
        </form>
      </div>
    </section>
  );
}
