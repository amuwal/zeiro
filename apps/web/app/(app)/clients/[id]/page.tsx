import { getClientDetail, listFirmUsers, listInquiriesByClient } from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClientArchiveBanner } from '@/components/clients/client-archive-banner';
import { ClientDangerZone } from '@/components/clients/client-danger-zone';
import { ClientDetailHeader } from '@/components/clients/client-detail-header';
import { ClientEditForm } from '@/components/clients/client-edit-form';
import { ClientInquiryHistory } from '@/components/clients/client-inquiry-history';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { created?: string };

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const { id } = await params;
  const flash = await searchParams;
  const [client, users, inquiries] = await Promise.all([
    getClientDetail(firmId, id),
    listFirmUsers(firmId),
    listInquiriesByClient(firmId, id),
  ]);
  if (!client) notFound();

  return (
    <div className="kb-pane cl-detail-pane anim-stagger">
      <div className="cl-detail-head">
        <div>
          <ClientDetailHeader client={client} />
        </div>
        <Link href="/clients" className="btn btn-secondary">
          <Icon name="arrow-right" size={13} style={{ transform: 'rotate(180deg)' }} />
          一覧へ戻る
        </Link>
      </div>

      {flash.created === '1' && <div className="cl-flash">顧問先を登録しました</div>}

      {client.archivedAt && (
        <ClientArchiveBanner clientId={client.id} archivedAt={client.archivedAt} />
      )}

      <ClientEditForm client={client} users={users.map((u) => ({ id: u.id, name: u.name }))} />

      <ClientInquiryHistory inquiries={inquiries} />

      <ClientDangerZone
        clientId={client.id}
        archived={Boolean(client.archivedAt)}
        inquiryCount={client.inquiryCount}
      />
    </div>
  );
}
