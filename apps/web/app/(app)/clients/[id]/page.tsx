import {
  findIntegration,
  getBindingByClient,
  getClientDetail,
  listFirmUsers,
  listInquiriesByClient,
} from '@zeiro/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClientArchiveBanner } from '@/components/clients/client-archive-banner';
import { ClientDangerZone } from '@/components/clients/client-danger-zone';
import { ClientDetailHeader } from '@/components/clients/client-detail-header';
import { ClientEditForm } from '@/components/clients/client-edit-form';
import { ClientInquiryHistory } from '@/components/clients/client-inquiry-history';
import { FreeeBindingCard } from '@/components/clients/freee-binding';
import { Icon } from '@/components/ui/icon';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { created?: string };

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireFirmContext();
  const firmId = ctx.firmId;
  const { id } = await params;
  const flash = await searchParams;
  const canManage = ctxCan(ctx, 'client.manage');
  const canManageIntegration = ctxCan(ctx, 'integration.manage');
  const [client, users, inquiries, freeeIntegration, freeeBinding] = await Promise.all([
    getClientDetail(firmId, id, viewerScope(ctx)),
    listFirmUsers(firmId),
    listInquiriesByClient(firmId, id),
    findIntegration(firmId, 'freee'),
    getBindingByClient(firmId, id, 'freee'),
  ]);
  if (!client) notFound();

  const freeeCompanies =
    ((freeeIntegration?.metadata as Record<string, unknown> | undefined)?.companies as
      | Array<{
          id: string;
          name: string;
          role: string;
        }>
      | undefined) ?? [];

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

      {canManage && (
        <ClientEditForm client={client} users={users.map((u) => ({ id: u.id, name: u.name }))} />
      )}

      {canManageIntegration && (
        <FreeeBindingCard
          clientId={client.id}
          isFirmConnected={Boolean(freeeIntegration && freeeIntegration.status === 'active')}
          companies={freeeCompanies}
          binding={
            freeeBinding
              ? { externalId: freeeBinding.externalId, externalName: freeeBinding.externalName }
              : null
          }
        />
      )}

      <ClientInquiryHistory inquiries={inquiries} />

      {canManage && (
        <ClientDangerZone
          clientId={client.id}
          archived={Boolean(client.archivedAt)}
          inquiryCount={client.inquiryCount}
        />
      )}
    </div>
  );
}
