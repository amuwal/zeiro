import { Icon } from '@/components/ui/icon';

type Props = {
  inquiry: {
    id: string;
    subject: string;
    body: string;
    receivedAt: string;
    senderName: string;
    senderRole: string;
    senderCompany: string;
    senderInitials: string;
    category: string;
  };
};

const CATEGORY_JP: Record<string, string> = {
  deadline: '期日確認',
  docs: '書類提出',
  tax: '税務質問',
  contract: '顧問契約',
  other: 'その他',
};

export function ThreadPlaceholder({ inquiry }: Props) {
  const cat = CATEGORY_JP[inquiry.category] ?? inquiry.category;
  return (
    <section className="thread-col">
      <div className="thread-head">
        <div className="thread-crumbs">
          <span>受信トレイ</span>
          <span className="sep">/</span>
          <b>{cat}</b>
          <span className="id">INQ-{inquiry.id.slice(0, 8).toUpperCase()}</span>
          <div className="actions">
            <button type="button" className="icon-btn-sm" title="アーカイブ">
              <Icon name="archive" size={14} />
            </button>
            <button type="button" className="icon-btn-sm" title="その他">
              <Icon name="more" size={14} />
            </button>
          </div>
        </div>

        <h1 className="thread-subject">{inquiry.subject}</h1>

        <div className="thread-meta">
          <div className="thread-from">
            <span className="pic">{inquiry.senderInitials}</span>
            <span className="who">{inquiry.senderName}</span>
            {inquiry.senderRole && (
              <>
                <span className="sep">/</span>
                <span>{inquiry.senderRole}</span>
              </>
            )}
            {inquiry.senderCompany && inquiry.senderCompany !== inquiry.senderName && (
              <>
                <span className="sep">/</span>
                <span>{inquiry.senderCompany}</span>
              </>
            )}
          </div>
          <span className="thread-tag">
            <span className="swatch" />
            {cat}
          </span>
        </div>
      </div>

      <div className="thread-body">
        <article className="turn incoming">
          <div className="turn-head">
            <div className="pic">{inquiry.senderInitials}</div>
            <div className="who">
              <div className="name">{inquiry.senderName}</div>
              <div className="role">
                {inquiry.senderRole || inquiry.senderCompany}
                {inquiry.senderRole && inquiry.senderCompany ? ` · ${inquiry.senderCompany}` : ''}
              </div>
            </div>
            <span className="time">{formatTime(inquiry.receivedAt)}</span>
          </div>
          <div className="turn-body">
            {inquiry.body.split('\n').map((line, i) => (
              <p key={i}>{line || ' '}</p>
            ))}
          </div>
        </article>
      </div>

      <div className="composer">
        <div className="composer-suggestions">
          {['そのまま送信', '編集して送信', '却下', '所長に転送'].map((s) => (
            <button key={s} type="button" className="sugg-chip">
              <span className="ico"><Icon name="spark" size={11} /></span>
              {s}
            </button>
          ))}
        </div>
        <div className="composer-box">
          <textarea
            className="composer-input"
            placeholder="顧問先への返信を入力…"
            rows={1}
          />
          <div className="composer-actions">
            <button type="button" className="icon-btn-sm" title="添付">
              <Icon name="paperclip" size={14} />
            </button>
            <button type="button" className="icon-btn-sm" title="ナレッジ参照">
              <Icon name="book" size={14} />
            </button>
            <button type="button" className="btn btn-primary">
              <Icon name="send" size={12} /> 送信
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
        <div className="composer-meta">
          <div className="group">
            <span className="item"><Icon name="shield" size={11} /> <b>テナント分離</b> 有効</span>
            <span className="item"><Icon name="clock" size={11} /> 一次対応 <b>—</b></span>
          </div>
          <span className="item">監査ログ <b>記録中</b></span>
        </div>
      </div>
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
