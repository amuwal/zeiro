import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export type ClientTabData = {
  id: string;
  initials: string;
  company: string;
  contractLabel: string;
  profileRows: Array<{ k: string; v: string }>;
  lifetimeInquiries: number;
  note: string;
};

export function ClientTab({ data }: { data: ClientTabData | null }) {
  if (!data) {
    return (
      <div className="sc-pane">
        <div className="empty">顧客情報なし</div>
      </div>
    );
  }
  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="client-snap">
          <div className="client-snap-pic">{data.initials}</div>
          <div className="client-snap-body">
            <div className="client-snap-name">{data.company}</div>
            <div className="client-snap-sub">{data.contractLabel}</div>
          </div>
        </div>
        <Link href={`/clients/${data.id}`} className="open-profile">
          顧客プロファイル全体を開く <Icon name="arrow-right" size={11} />
        </Link>
      </section>

      <section className="sc-block">
        <div className="sc-block-head">
          <span>顧問先プロフィール</span>
        </div>
        {data.profileRows.length > 0 ? (
          <div className="kv-card">
            {data.profileRows.map((row) => (
              <div key={row.k} className="kv-line">
                <span className="k">{row.k}</span>
                <span className="v">{row.v}</span>
              </div>
            ))}
          </div>
        ) : (
          <Link href={`/clients/${data.id}`} className="open-profile">
            プロフィール未設定 — 決算月や顧問料を登録すると下書き精度が上がります{' '}
            <Icon name="arrow-right" size={11} />
          </Link>
        )}
      </section>

      <section className="sc-block">
        <div className="sc-block-head">
          <span>取引履歴</span>
        </div>
        <div className="kv-card">
          <div className="kv-line">
            <span className="k">累計問合せ</span>
            <span className="v mono">{data.lifetimeInquiries}</span>
          </div>
        </div>
      </section>

      {data.note && (
        <section className="sc-block">
          <div className="sc-block-head">
            <span>担当者メモ</span>
          </div>
          <p className="note-box">{data.note}</p>
        </section>
      )}
    </div>
  );
}
