/* global React, CATEGORIES, KB, Icon, ConfidenceDots */
const { useState: useStateDetail, useEffect: useEffectDetail, useMemo: useMemoDetail, useRef: useRefDetail } = React;

function DraftBlock({ blocks, onCiteHover, onCiteLeave, highlightedCite, typing }) {
  // Reveal-by-blocks animation when typing
  const [shown, setShown] = useStateDetail(typing ? 0 : blocks.length);
  useEffectDetail(() => {
    if (!typing) { setShown(blocks.length); return; }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= blocks.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [blocks, typing]);

  return (
    <div className="draft-body">
      {blocks.slice(0, shown).map((b, i) => {
        const style = { fontWeight: b.b ? 600 : 400, color: b.b ? "var(--ink)" : undefined };
        return (
          <React.Fragment key={i}>
            <span style={style}>{b.t}</span>
            {b.c && (
              <a
                className="cite"
                onMouseEnter={() => onCiteHover(b.c)}
                onMouseLeave={onCiteLeave}
                style={highlightedCite === b.c ? { background: "var(--accent)", color: "var(--surface)" } : null}
              >{Object.keys(KB).indexOf(b.c) >= 0 ? `[${b.c.split("-")[1]}]` : ""}</a>
            )}
          </React.Fragment>
        );
      })}
      {typing && shown < blocks.length && <span className="typing-caret" />}
    </div>
  );
}

function CitationRow({ id, num, highlighted, onHover, onLeave }) {
  const k = KB[id];
  if (!k) return null;
  return (
    <div
      className={`cite-row ${highlighted ? "highlighted" : ""}`}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={onLeave}
    >
      <div className="cite-num">{num.toString().padStart(2, "0")}</div>
      <div className="cite-content">
        <div className="cite-title">{k.title}</div>
        <div className="cite-meta">
          <span className="src">{k.src}</span><span className="dot">·</span>
          <span>{k.section}</span><span className="dot">·</span>
          <span>更新 {k.updated}</span>
        </div>
      </div>
      <div className="cite-score">
        <b>{(0.78 + (num * 0.04) % 0.2).toFixed(2)}</b>
        <span>relevance</span>
      </div>
    </div>
  );
}

function Detail({ inq, onSend, sentToast }) {
  const [highlightedCite, setHighlightedCite] = useStateDetail(null);
  const [editing, setEditing] = useStateDetail(false);
  const [typing, setTyping] = useStateDetail(false);
  const prevId = useRefDetail();

  // Replay typing animation when switching items
  useEffectDetail(() => {
    if (prevId.current !== inq?.id) {
      setTyping(true);
      const t = setTimeout(() => setTyping(false), 50);
      prevId.current = inq?.id;
      return () => clearTimeout(t);
    }
  }, [inq?.id]);

  if (!inq) {
    return <div className="detail-col"><div className="empty">問い合わせを選択してください</div></div>;
  }

  const cat = CATEGORIES[inq.category];
  const isEscalated = inq.status === "escalated";
  const confLevel = inq.confidence >= 0.85 ? "" : inq.confidence >= 0.7 ? "med" : "low";

  return (
    <section className="detail-col" key={inq.id}>
      <header className="detail-head detail-anim">
        <div className="detail-toprow">
          <div className="crumbs">
            <span>受信トレイ</span><span className="sep">/</span>
            <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{cat.jp}</span>
          </div>
          <span className="id">{inq.id}</span>
          <div className="actions">
            <button className="icon-btn"><Icon name="archive" size={14} /></button>
            <button className="icon-btn"><Icon name="more" size={14} /></button>
          </div>
        </div>
        <div className="detail-subject">{inq.subject}</div>
        <div className="detail-meta-row">
          <div className="detail-from">
            <div className="pic">{inq.initials}</div>
            <div>
              <span className="who">{inq.contactName}</span>
              <span style={{ color: "var(--muted)", margin: "0 6px" }}>·</span>
              <span style={{ color: "var(--muted)" }}>{inq.contactRole}</span>
              <span style={{ color: "var(--muted)", margin: "0 6px" }}>·</span>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{inq.company}</span>
            </div>
          </div>
          <span className="detail-tag">
            <span className="swatch" style={{ background: cat.color }} />
            {cat.jp}
          </span>
          <span className="detail-tag" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <Icon name="clock" size={11} /> {inq.receivedFull}
          </span>
        </div>
      </header>

      <div className="detail-body detail-anim">
        {/* Original message */}
        <div className="section">
          <div className="section-head">
            <span>ORIGINAL MESSAGE</span>
            <span style={{ flex: "none" }} className="badge">FROM {inq.email}</span>
          </div>
          <div className="orig-card">
            <div className="orig-meta">
              <span><b>From</b>{inq.contactName} &lt;{inq.email}&gt;</span>
              <span><b>To</b>inquiry@rin-tax.co.jp</span>
              <span><b>Received</b>{inq.receivedFull}</span>
            </div>
            <div className="orig-body">{inq.body}</div>
            {inq.attachments.length > 0 && (
              <div className="orig-attach">
                {inq.attachments.map((a, i) => (
                  <span key={i} className="attach-chip">
                    <span className="ico"><Icon name="paperclip" size={12} /></span>
                    {a.name}
                    <span className="size">{a.size}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI analysis */}
        <div className="section">
          <div className="section-head"><span>AI ANALYSIS</span></div>
          <div className="ai-banner">
            <div className="ai-icon">AI</div>
            <div className="ai-content">
              <div className="ai-row">
                <span className="label">分類</span>
                <span className="val" style={{ color: cat.color }}>● {cat.jp}</span>
                <span className="sep" />
                <span className="label">信頼度</span>
                <div className={`confidence-bar ${confLevel}`}><i style={{ width: `${inq.confidence * 100}%` }} /></div>
                <span className="val" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{Math.round(inq.confidence * 100)}%</span>
                <span className="sep" />
                <span className="label">緊急度</span>
                <span className="val" style={{ color: inq.urgent ? "var(--urgent)" : "var(--ink-2)" }}>
                  {inq.urgent ? "高" : "通常"}
                </span>
              </div>
              <div className="ai-reason">{inq.aiReason}</div>
            </div>
          </div>
        </div>

        {/* Escalation banner */}
        {isEscalated && (
          <div className="escalate-banner">
            <div className="ico"><Icon name="alert" size={15} /></div>
            <div className="text">
              <div className="title">所長税理士のレビューを推奨</div>
              <div className="sub">
                {inq.urgent
                  ? "緊急キーワード検出により自動エスカレーション。下書きは初動連絡のみ生成。"
                  : inq.category === "contract"
                    ? "顧問契約カテゴリは全件人間判断必須。下書きは生成されません。"
                    : `信頼度 ${Math.round(inq.confidence * 100)}% は閾値 75% を下回っています。`}
              </div>
            </div>
            <button className="assign">所長へ割当 <Icon name="arrow-right" size={12} /></button>
          </div>
        )}

        {/* AI draft */}
        {inq.draft ? (
          <div className="section">
            <div className="section-head">
              <span>AI DRAFT</span>
              <span className="badge">CLAUDE-4.5 · 1.2s</span>
            </div>
            <div className="draft-card">
              <div className="draft-head">
                <span className="label">下書き</span>
                <span className="gen-time">生成 0.42秒前 · {inq.citations.length}件のナレッジを参照</span>
                <button className="edit-toggle" onClick={() => setEditing(e => !e)}>
                  <Icon name="edit" size={11} /> {editing ? "編集を終了" : "編集"}
                </button>
              </div>
              <DraftBlock
                blocks={inq.draft}
                onCiteHover={setHighlightedCite}
                onCiteLeave={() => setHighlightedCite(null)}
                highlightedCite={highlightedCite}
                typing={typing}
              />
            </div>
          </div>
        ) : isEscalated ? (
          <div className="section">
            <div className="section-head"><span>AI DRAFT</span><span className="badge">SUPPRESSED</span></div>
            <div className="orig-card" style={{ background: "var(--surface-2)", textAlign: "center", padding: "32px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 13 }}>下書きは生成されていません — 個別判断が必要なため、所長税理士にお繋ぎします。</div>
            </div>
          </div>
        ) : null}

        {/* Citations */}
        {inq.citations.length > 0 && (
          <div className="section">
            <div className="section-head"><span>SOURCE KNOWLEDGE</span><span className="badge">{inq.citations.length} 件</span></div>
            <div className="cite-list">
              {inq.citations.map((id, i) => (
                <CitationRow
                  key={id}
                  id={id}
                  num={i + 1}
                  highlighted={highlightedCite === id}
                  onHover={setHighlightedCite}
                  onLeave={() => setHighlightedCite(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="detail-actions">
        <div className="action-meta">
          <span className="item"><Icon name="shield" size={12} /> <b>テナント分離</b> 有効</span>
          <span className="item"><Icon name="clock" size={12} /> 一次対応 <b>2分18秒</b></span>
          <span className="item"><Icon name="doc" size={12} /> 監査ログ <b>記録中</b></span>
        </div>
        <div className="btn-cluster">
          <button className="btn btn-ghost"><Icon name="x" size={13} /> 却下</button>
          <button className="btn btn-secondary"><Icon name="edit" size={13} /> 編集して送信</button>
          <button className="btn btn-primary" onClick={() => onSend(inq.id)} disabled={!inq.draft}>
            <Icon name="send" size={13} /> そのまま送信 <span className="kbd">⌘↵</span>
          </button>
        </div>
      </footer>

      {sentToast && (
        <div style={{
          position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "var(--bg)", padding: "10px 18px",
          borderRadius: 999, fontSize: 12.5, fontWeight: 500,
          boxShadow: "var(--shadow-lg)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "fade-up 280ms var(--ease-out)",
          zIndex: 50,
        }}>
          <Icon name="check" size={14} /> 送信完了 — ナレッジに追加されました
        </div>
      )}
    </section>
  );
}

window.Detail = Detail;
