import { listClientImports, listClientsRich } from '@zeiro/db';
import Link from 'next/link';
import { ClientFlashBanner } from '@/components/clients/client-flash-banner';
import { ClientImportFlash } from '@/components/clients/client-import-flash';
import { ClientImportsBanner } from '@/components/clients/client-imports-banner';
import { ClientList } from '@/components/clients/client-list';
import { ClientStats } from '@/components/clients/client-stats';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = {
  deleted?: string;
  archived?: string;
  imported?: string;
  skipped?: string;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const [items, imports, params] = await Promise.all([
    listClientsRich(firmId),
    listClientImports(firmId, 6),
    searchParams,
  ]);

  const monthly = items.filter((c) => c.contractType === 'monthly').length;
  const spot = items.filter((c) => c.contractType === 'spot').length;
  const prospect = items.filter((c) => c.contractType === 'prospect').length;
  const unverified = items.filter((c) => c.contractType === 'unverified').length;
  const archived = items.filter((c) => c.archivedAt !== null).length;

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">顧問先</div>
          <div className="kb-sub">
            事務所の顧問先一覧 — {items.length}件 (アーカイブ {archived}件)
          </div>
        </div>
        <div className="btn-cluster">
          <Link href="/clients/import" className="btn btn-secondary">
            <Icon name="upload" size={13} /> 一括取り込み
          </Link>
          <Link href="/clients/new" className="btn btn-primary">
            <Icon name="user" size={13} /> 新規顧問先
          </Link>
        </div>
      </div>

      <ClientFlashBanner deleted={params.deleted === '1'} />
      {params.imported && (
        <ClientImportFlash imported={Number(params.imported)} skipped={Number(params.skipped)} />
      )}

      <ClientImportsBanner imports={imports} />

      <ClientStats
        total={items.length}
        monthly={monthly}
        spot={spot}
        prospect={prospect}
        unverified={unverified}
      />

      <ClientList items={items} />
    </div>
  );
}
