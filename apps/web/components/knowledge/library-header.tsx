import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

type Props = {
  firmName: string;
  totalFirm: number;
  globalEnabled: number;
  globalTotal: number;
};

export function LibraryHeader({ firmName, totalFirm, globalEnabled, globalTotal }: Props) {
  return (
    <header className="kb-library-head">
      <div className="kb-library-eyebrow">
        <span>ナレッジベース</span>
        <span className="kb-library-eyebrow-sep" aria-hidden />
        <span>{firmName}</span>
      </div>
      <div className="kb-library-headline">
        <h1 className="kb-library-title">所内ナレッジと共有パックを一元管理</h1>
        <Link href="/knowledge/new" className="btn btn-primary kb-library-cta">
          <Icon name="edit" size={13} />
          新規追加
        </Link>
      </div>
      <p className="kb-library-summary">
        <strong>{totalFirm}件</strong>の事務所ナレッジと
        <strong>
          {' '}
          {globalEnabled}/{globalTotal}件
        </strong>
        の共有パックを AI が参照しています。
      </p>
    </header>
  );
}
