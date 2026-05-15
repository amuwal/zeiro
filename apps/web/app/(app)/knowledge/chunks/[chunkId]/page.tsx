import { getChunkForFirm } from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChunkDetailView } from '@/components/knowledge/chunk-detail-view';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type Params = { chunkId: string };

export default async function ChunkDetailPage({ params }: { params: Promise<Params> }) {
  const { chunkId } = await params;
  const { firmId } = await requireFirmContext();
  const chunk = await getChunkForFirm(firmId, chunkId);
  if (!chunk) notFound();

  const backHref = chunk.scope === 'global' ? '/knowledge/packs/jp-tax-faq' : '/knowledge';
  const backLabel = chunk.scope === 'global' ? 'JP税法FAQに戻る' : 'ナレッジに戻る';

  return (
    <div className="kb-library">
      <Link href={backHref} className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>{backLabel}</span>
      </Link>
      <ChunkDetailView chunk={chunk} />
    </div>
  );
}
