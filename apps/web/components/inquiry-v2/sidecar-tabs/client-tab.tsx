import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export type ClientTabData = {
  id: string;
  initials: string;
  company: string;
  contactName: string;
  contactRole: string;
  tags: string[];
  contract: string;
  monthlyFee: number;
  since: string;
  fiscalYearEnd: string;
  industry: string;
  lifetimeInquiries: number;
  avgFirstReplyMin: number;
  openCount: number;
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
            <div className="client-snap-sub">
              {data.contactName} · {data.contactRole}
            </div>
            <div className="client-snap-tags">
              {data.tags.map((t) => (
                <span key={t} className="tag-mini">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <Link href={`/clients/${data.id}`} className="open-profile">
          顧客プロファイル全体を開く <Icon name="arrow-right" size={11} />
        </Link>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>契約サマリー</span></div>
        <div className="kv-card">
          <div className="kv-line"><span className="k">顧問プラン</span><span className="v">{data.contract}</span></div>
          <div className="kv-line"><span className="k">月額</span><span className="v mono">¥{data.monthlyFee.toLocaleString()}</span></div>
          <div className="kv-line"><span className="k">契約開始</span><span className="v mono">{data.since}</span></div>
          <div className="kv-line"><span className="k">事業年度</span><span className="v">{data.fiscalYearEnd}決算</span></div>
          <div className="kv-line"><span className="k">業種</span><span className="v">{data.industry}</span></div>
        </div>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>取引履歴</span></div>
        <div className="stat-row">
          <div className="stat-cell">
            <div className="stat-num">{data.lifetimeInquiries}</div>
            <div className="stat-lbl">累計問合せ</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">
              {data.avgFirstReplyMin}<span className="unit">m</span>
            </div>
            <div className="stat-lbl">平均初動</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{data.openCount}</div>
            <div className="stat-lbl">未対応</div>
          </div>
        </div>
      </section>

      {data.note && (
        <section className="sc-block">
          <div className="sc-block-head"><span>担当者メモ</span></div>
          <p className="note-box">{data.note}</p>
        </section>
      )}
    </div>
  );
}
