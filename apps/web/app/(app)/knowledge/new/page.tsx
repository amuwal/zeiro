import Link from 'next/link';
import { IngestForm } from '@/components/knowledge/ingest-form';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

export default async function NewKnowledgePage() {
  await requireFirmContext();
  return (
    <div className="kb-library">
      <Link href="/knowledge" className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>ナレッジに戻る</span>
      </Link>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>新規取込</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>事務所ナレッジ</span>
          </div>
          <h1 className="kb-detail-title">ナレッジを追加</h1>
          <p className="kb-detail-desc">
            PDF・Word・メール・テキストを取り込むと AI
            が自動で分割・埋め込みを行い、問い合わせ対応の下書きで参照できるようになります。
          </p>
        </div>
        <aside className="kb-ingest-side">
          <ul className="kb-ingest-checklist">
            <li>
              <Icon name="check" size={13} />
              <span>PDF · DOCX · XLSX · CSV · TXT · Markdown · EML</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>スキャンPDFは Tesseract で自動OCR (日英対応)</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>言語自動判定 + 言語別チャンク分割</span>
            </li>
            <li>
              <Icon name="check" size={13} />
              <span>表は構造を保ったまま抽出 (DOCX / XLSX)</span>
            </li>
            <li>
              <Icon name="alert" size={13} />
              <span>パスワード保護PDFは解除してからアップロード</span>
            </li>
          </ul>
        </aside>
      </header>
      <IngestForm />
    </div>
  );
}
