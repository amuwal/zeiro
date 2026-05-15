import { getClientImport } from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImportPreviewView } from '@/components/clients/import-preview-view';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type Params = { importId: string };

export default async function ClientImportDetailPage({ params }: { params: Promise<Params> }) {
  const { importId } = await params;
  const { firmId } = await requireFirmContext();
  const importRow = await getClientImport(firmId, importId);
  if (!importRow) notFound();

  return (
    <div className="kb-library">
      <Link href="/clients" className="kb-back">
        <Icon name="chevron-right" size={12} />
        <span>顧問先一覧に戻る</span>
      </Link>
      <ImportPreviewView importRow={importRow} />
    </div>
  );
}
