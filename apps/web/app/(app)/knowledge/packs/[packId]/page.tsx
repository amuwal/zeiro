import { listGlobalSourcesForFirm } from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackDetailView } from '@/components/knowledge/pack-detail-view';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type Params = { packId: string };

const PACKS = {
  'jp-tax-faq': {
    title: 'JP税法FAQ',
    description:
      '事務所共通の基本Q&A — 申告期限・書類提出・税務質問など、よく聞かれる質問への一次回答用に。',
    eyebrow: '標準パック',
  },
} as const;

export default async function PackDetailPage({ params }: { params: Promise<Params> }) {
  const { packId } = await params;
  const pack = PACKS[packId as keyof typeof PACKS];
  if (!pack) notFound();

  const { firmId } = await requireFirmContext();
  const listings = await listGlobalSourcesForFirm(firmId);

  return (
    <div className="kb-library">
      <Link href="/knowledge" className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>ナレッジに戻る</span>
      </Link>
      <PackDetailView pack={pack} listings={listings} />
    </div>
  );
}
