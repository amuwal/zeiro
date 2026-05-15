import Link from 'next/link';
import { ImportUploadForm } from '@/components/clients/import-upload-form';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

export default async function ClientImportPage() {
  await requireFirmContext();
  return (
    <div className="kb-library">
      <Link href="/clients" className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>顧問先一覧に戻る</span>
      </Link>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>一括取り込み</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>CSV / Excel</span>
          </div>
          <h1 className="kb-detail-title">顧問先を一括で登録</h1>
          <p className="kb-detail-desc">
            会計ソフトや表計算からエクスポートしたファイルをアップロードしてください。
            列名や書式が標準と違っていても、AI が自動で名前・メールアドレス・契約形態を抽出します。
            プレビューで内容を確認してから登録するため、不適切な行は除外できます。
          </p>
        </div>
        <aside className="kb-ingest-side">
          <ul className="kb-ingest-checklist">
            <li>
              <Icon name="check" size={13} />
              <span>列の並びや見出し名は自由 — AI が自動で読み取り</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>1セルに複数メールがあっても代表アドレスを抽出</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>Shift-JIS / UTF-8 / 複数シートに対応</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>すでに登録済みのメールは自動でスキップ</span>
            </li>
            <li>
              <Icon name="alert" size={13} />
              <span>1回あたり500件まで (超過分は次回に分割)</span>
            </li>
          </ul>
        </aside>
      </header>
      <ImportUploadForm />
    </div>
  );
}
