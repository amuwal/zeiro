import { listFirmChunksByDocument } from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocDetailView } from '@/components/knowledge/doc-detail-view';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type Params = { docId: string };

export default async function DocDetailPage({ params }: { params: Promise<Params> }) {
  const { docId } = await params;
  const decoded = decodeURIComponent(docId);
  const { firmId } = await requireFirmContext();
  const chunks = await listFirmChunksByDocument(firmId, decoded);
  if (chunks.length === 0) notFound();

  return (
    <div className="kb-library">
      <Link href="/knowledge" className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>ナレッジに戻る</span>
      </Link>
      <DocDetailView chunks={chunks} />
    </div>
  );
}
