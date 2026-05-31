const STREAM_ROWS: Array<{ chan: string; sub: string; t: string }> = [
  { chan: 'LINE', sub: '税務調査の事前通知が来ました — 鈴木代表', t: '10:21' },
  { chan: 'FORM', sub: '源泉徴収票の送付先について — 田中様', t: '09:58' },
  { chan: 'EMAIL', sub: '消費税の中間納付スケジュール — 鈴木建設', t: '08:47' },
];

export function HeroDemo() {
  return (
    <div className="hero-demo">
      <div className="demo-stage" aria-hidden="true">
        <div className="demo-bar">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <span className="label">INBOX · LIVE</span>
          <span className="step">
            <span className="ring" />
            agent · processing
          </span>
        </div>

        <div className="demo-body">
          <div className="demo-incoming">
            <span className="channel">EMAIL</span>
            <span className="who">山田 正彦 · 株式会社山田商事</span>
            <span className="time">10:42</span>
            <span className="subject">3月決算法人税の申告期限について確認させてください</span>
            <span className="preview">
              いつもお世話になっております。本年度の法人税申告ですが、提出期限と納付期限について…
            </span>
          </div>

          <div className="demo-classify">
            <span>分類</span>
            <span className="arrow" />
            <span className="classify-pill">
              期日確認
              <span className="conf">conf 0.94</span>
            </span>
            <span className="arrow" />
            <span>下書き生成</span>
          </div>

          <div className="demo-draft">
            <div className="demo-draft-head">
              <span className="badge">AI · v2</span>
              <span>下書き</span>
              <span className="gen-ms">generated · 1.2s</span>
            </div>
            <div className="demo-draft-text">
              <span className="l l1">山田 正彦様、いつもお世話になっております。</span>
              <span className="l l2">
                3月決算ですので、<b>提出期限は 2026年5月31日</b>。
                <span className="cite c1">kb-001</span>
              </span>
              <span className="l l3">
                e-Tax電子提出をご希望とのこと、承知いたしました。
                <span className="cite c2">kb-005</span>
              </span>
              <span className="l l4">
                事前確認ドラフトは5月20日にお送りします。<span className="cite c3">kb-003</span>
              </span>
            </div>
            <div className="demo-draft-foot">
              <span className="ok">
                <span className="dot" /> 送信準備完了
              </span>
              <span className="send">送信 ↵</span>
            </div>
          </div>

          <div className="demo-stream">
            {STREAM_ROWS.map((row) => (
              <div className="stream-row" key={row.sub}>
                <span className="chan">{row.chan}</span>
                <span className="sub">{row.sub}</span>
                <span className="t">{row.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
