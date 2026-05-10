import { listClientsRich } from '@zeiro/db';
import Link from 'next/link';
import { ClientFlashBanner } from '@/components/clients/client-flash-banner';
import { ClientList } from '@/components/clients/client-list';
import { ClientStats } from '@/components/clients/client-stats';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { deleted?: string; archived?: string };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const [items, params] = await Promise.all([listClientsRich(firmId), searchParams]);

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
          <Link href="/clients/new" className="btn btn-primary">
            <Icon name="user" size={13} /> 新規顧問先
          </Link>
        </div>
      </div>

      <ClientFlashBanner deleted={params.deleted === '1'} />

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
