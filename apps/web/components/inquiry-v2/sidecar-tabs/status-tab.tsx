export type StatusTabData = {
  inboundCount: number;
  outboundCount: number;
  sentiment: string;
  elapsedLabel: string;
  openItems: string[];
  reasoning: string;
  timeline: Array<{
    time: string;
    label: string;
    sub: string;
    state: 'done' | 'now' | 'pending';
  }>;
  audit: {
    channel: string;
    threadId: string;
    tenantIsolation: string;
    recording: string;
  };
};

export function StatusTab({ data }: { data: StatusTabData }) {
  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="sc-block-head"><span>会話の状態</span></div>
        <div className="health-grid">
          <div className="health-cell">
            <div className="hc-lbl">往復</div>
            <div className="hc-val">
              {data.inboundCount}
              <span className="sep">/</span>
              {data.outboundCount}
            </div>
            <div className="hc-sub">受信 / 返信</div>
          </div>
          <div className="health-cell">
            <div className="hc-lbl">トーン</div>
            <div className="hc-val small">{data.sentiment}</div>
            <div className="hc-sub">直近メッセージ</div>
          </div>
          <div className="health-cell">
            <div className="hc-lbl">経過</div>
            <div className="hc-val">{data.elapsedLabel}</div>
            <div className="hc-sub">一次対応</div>
          </div>
        </div>
      </section>

      {data.openItems.length > 0 && (
        <section className="sc-block">
          <div className="sc-block-head">
            <span>残るオープン項目</span>
            <span className="meta">{data.openItems.length}</span>
          </div>
          <div className="open-list">
            {data.openItems.map((q, i) => (
              <div key={i} className="open-row">
                <span className="open-num">{i + 1}</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sc-block">
        <div className="sc-block-head"><span>判定理由</span></div>
        <p className="reason">{renderReasonWithEmphasis(data.reasoning)}</p>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>このスレッドの履歴</span></div>
        <div className="timeline">
          {data.timeline.map((row, i) => (
            <div
              key={i}
              className={`tl-row ${row.state === 'now' ? 'now' : ''} ${row.state === 'done' ? 'active' : ''}`}
            >
              <div className="tl-time">{row.time}</div>
              <div className="tl-dot" />
              <div className="tl-body">
                <div className="tl-label">{row.label}</div>
                <div className="tl-sub">{row.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>監査ログ</span></div>
        <div className="kv-card">
          <div className="kv-line">
            <span className="k">チャンネル</span>
            <span className="v">{data.audit.channel}</span>
          </div>
          <div className="kv-line">
            <span className="k">スレッドID</span>
            <span className="v mono">{data.audit.threadId}</span>
          </div>
          <div className="kv-line">
            <span className="k">テナント分離</span>
            <span className="v">{data.audit.tenantIsolation}</span>
          </div>
          <div className="kv-line">
            <span className="k">記録</span>
            <span className="v">{data.audit.recording}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function renderReasonWithEmphasis(text: string): React.ReactNode {
  const parts = text.split(/「([^」]+)」/);
  return parts.map((s, i) =>
    i % 2 === 1 ? (
      <em key={i}>「{s}」</em>
    ) : (
      <span key={i}>{s}</span>
    ),
  );
}
