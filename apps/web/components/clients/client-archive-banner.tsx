import { unarchiveClientAction } from '@/app/(app)/clients/actions';

export function ClientArchiveBanner({
  clientId,
  archivedAt,
}: {
  clientId: string;
  archivedAt: string;
}) {
  return (
    <div className="cl-archive-banner">
      <span>
        この顧問先は <strong>{new Date(archivedAt).toLocaleDateString('ja-JP')}</strong>{' '}
        にアーカイブされています。新規問い合わせは引き続き紐付けされますが、一覧では既定で非表示になります。
      </span>
      <form action={unarchiveClientAction}>
        <input type="hidden" name="clientId" value={clientId} />
        <button type="submit" className="btn btn-secondary">
          アーカイブ解除
        </button>
      </form>
    </div>
  );
}
