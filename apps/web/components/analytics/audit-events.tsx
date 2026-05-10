import { Icon, type IconName } from '@/components/ui/icon';

type Event = {
  icon: IconName;
  title: string;
  sub: string;
  status: 'ok' | 'warn';
};

const EVENTS: Event[] = [
  { icon: 'shield', title: 'テナント分離テスト', sub: '5/8 自動実行 · 通過', status: 'ok' },
  { icon: 'doc', title: '監査ログ整合性チェック', sub: '5/9 03:00 · 全件一致', status: 'ok' },
  { icon: 'alert', title: 'マイナンバー検出（マスク済）', sub: '本日 3件 · 自動マスキング', status: 'ok' },
  { icon: 'flag', title: '法改正フラグ更新', sub: '強制レビュー対象に変更', status: 'warn' },
];

export function AuditEvents() {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">監査・コンプライアンス</div>
          <div className="chart-sub">直近の重要イベント</div>
        </div>
      </div>
      <div className="audit-list">
        {EVENTS.map((e) => (
          <div key={e.title} className={`audit-row ${e.status === 'warn' ? 'warn' : ''}`}>
            <div className="ico">
              <Icon name={e.icon} size={13} />
            </div>
            <div>
              <div className="title">{e.title}</div>
              <div className="sub">{e.sub}</div>
            </div>
            <Icon name="check" size={13} stroke={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
