import { listFirmUsers } from '@zeiro/db';
import Link from 'next/link';
import { ClientNewForm } from '@/components/clients/client-new-form';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { email?: string; name?: string; from?: string; inquiry?: string };

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const [users, params] = await Promise.all([listFirmUsers(firmId), searchParams]);
  const prefill = {
    name: typeof params.name === 'string' ? params.name : '',
    primaryEmail: typeof params.email === 'string' ? params.email : '',
    sourceHint: typeof params.from === 'string' ? params.from : null,
    promoteInquiryId: typeof params.inquiry === 'string' ? params.inquiry : null,
  };

  return (
    <div className="kb-pane cl-detail-pane anim-stagger">
      <div className="cl-detail-head">
        <div>
          <h1 className="cl-detail-title">新規顧問先</h1>
          <div className="cl-detail-meta">連絡先情報を入力してください。後から編集できます。</div>
        </div>
        <Link href="/clients" className="btn btn-secondary">
          <Icon name="arrow-right" size={13} style={{ transform: 'rotate(180deg)' }} />
          顧問先一覧
        </Link>
      </div>

      {prefill.sourceHint === 'email' && (
        <div className="cl-flash">受信したメール「{prefill.primaryEmail}」をもとに登録します</div>
      )}

      <ClientNewForm users={users.map((u) => ({ id: u.id, name: u.name }))} prefill={prefill} />
    </div>
  );
}
