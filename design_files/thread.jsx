/* global React, CATEGORIES, KB, THREADS, SIDECAR, Icon */
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT, useMemo: useMemoT } = React;

/* ---------------------------- helpers ---------------------------- */

function buildTurnsFromInquiry(inq) {
  // If THREADS has data, use it. Otherwise synthesize a 1- or 2-turn thread
  // from the inquiry's legacy fields so this view works for every item.
  if (THREADS[inq.id]) return THREADS[inq.id];
  const turns = [{
    kind: "incoming",
    who: { name: inq.contactName, role: `${inq.contactRole} · ${inq.company}`, initials: inq.initials },
    time: inq.receivedFull,
    body: inq.body,
    attachments: inq.attachments || [],
  }];
  if (inq.status === "sent" && inq.draft) {
    turns.push({
      kind: "outgoing",
      who: { name: "佐藤 健一", role: "凜事務所", initials: "SK" },
      time: inq.receivedFull,
      body: inq.draft.map(b => b.t).join(""),
    });
  } else if (inq.draft) {
    turns.push({
      kind: "draft",
      who: { name: "AI Agent", role: "下書きを生成", initials: "AI" },
      time: inq.receivedFull,
      generatedMs: 1200,
      version: 1,
      versions: [{ v: 1, stamp: "00:00", label: "初回生成", active: true }],
      aiNote: inq.aiReason,
      blocks: inq.draft,
    });
  }
  return turns;
}

/* ---------------------------- blocks ---------------------------- */

function DraftBlocks({ blocks, onCiteHover, onCiteLeave, highlightedCite, typing }) {
  const [shown, setShown] = useStateT(typing ? 0 : blocks.length);
  useEffectT(() => {
    if (!typing) { setShown(blocks.length); return; }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i++; setShown(i);
      if (i >= blocks.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [blocks, typing]);

  return (
    <div className="draft-body">
      {blocks.slice(0, shown).map((b, i) => {
        const style = { fontWeight: b.b ? 600 : 400, color: b.b ? "var(--ink-0)" : undefined };
        return (
          <React.Fragment key={i}>
            <span style={style}>{b.t}</span>
            {b.c && (
              <a
                className={`cite ${highlightedCite === b.c ? "active" : ""}`}
                onMouseEnter={() => onCiteHover(b.c)}
                onMouseLeave={onCiteLeave}
              >{b.c.split("-")[1]}</a>
            )}
          </React.Fragment>
        );
      })}
      {typing && shown < blocks.length && <span className="typing-caret" />}
    </div>
  );
}

/* ---------------------------- turns ---------------------------- */

function IncomingTurn({ turn }) {
  return (
    <article className="turn incoming">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="time">{turn.time}</span>
        </header>
        <div className="turn-msg">{turn.body}</div>
        {turn.attachments && turn.attachments.length > 0 && (
          <div className="attach-row">
            {turn.attachments.map((a, i) => (
              <span key={i} className="attach-chip">
                <span className="ico"><Icon name="paperclip" size={12} /></span>
                {a.name}
                <span className="size">{a.size}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function OutgoingTurn({ turn }) {
  return (
    <article className="turn agent outgoing">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="badge"><Icon name="check" size={9} /> 送信済</span>
          <span className="time">{turn.time}</span>
        </header>
        <div className="turn-msg">{turn.body}</div>
        {turn.sentVia && (
          <div className="ai-note">
            <span className="ai-note-glyph"><Icon name="spark" size={11} /></span>
            <span><em>{turn.sentVia}</em></span>
          </div>
        )}
      </div>
    </article>
  );
}

function DraftTurn({ turn, inq, highlightedCite, onCiteHover, onCiteLeave, typing, onSend, onEdit, editing }) {
  return (
    <article className="turn draft">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="badge">DRAFT · v{turn.version}</span>
          <span className="time">{turn.time}</span>
        </header>

        {turn.aiNote && (
          <div className="ai-note">
            <span className="ai-note-glyph"><Icon name="spark" size={11} /></span>
            <span>{turn.aiNote}</span>
          </div>
        )}

        <div className="draft-card">
          <div className="draft-strip">
            <span className="mini-stat"><b>{inq.citations.length}</b> KB参照</span>
            <span className="strip-divider" />
            <span className="mini-stat">信頼度 <b>{Math.round(inq.confidence * 100)}%</b></span>
            <span className="strip-divider" />
            <span className="mini-stat">CLAUDE-4.5</span>
            <span className="gen-time">{turn.generatedMs}ms · {turn.time}</span>
          </div>

          <DraftBlocks
            blocks={turn.blocks}
            onCiteHover={onCiteHover}
            onCiteLeave={onCiteLeave}
            highlightedCite={highlightedCite}
            typing={typing}
          />

          {turn.versions && turn.versions.length > 1 && (
            <div className="draft-versions">
              <span>VERSIONS</span>
              {turn.versions.map(v => (
                <button key={v.v} className={`v ${v.active ? "active" : ""}`}>
                  v{v.v}<span className="stamp">· {v.stamp}</span>
                </button>
              ))}
            </div>
          )}

          <div className="draft-actions">
            <button className="btn btn-ghost" onClick={onEdit}>
              <Icon name="edit" size={12} /> {editing ? "完了" : "編集"}
            </button>
            <button className="btn btn-ghost">
              <Icon name="spark" size={12} /> 再生成
            </button>
            <span className="spacer" />
            <span className="note">⌘↵ で送信</span>
            <button className="btn btn-secondary">
              <Icon name="x" size={12} /> 却下
            </button>
            <button className="btn btn-primary" onClick={onSend}>
              <Icon name="send" size={12} /> そのまま送信
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------- composer ---------------------------- */

function Composer({ inq, onSend }) {
  const [text, setText] = useStateT("");
  const ta = useRefT(null);
  useEffectT(() => {
    if (!ta.current) return;
    ta.current.style.height = "auto";
    ta.current.style.height = Math.min(ta.current.scrollHeight, 200) + "px";
  }, [text]);
  const suggestions = inq.draft
    ? ["AI下書きを送信", "丁寧な書き出しに調整", "別の選択肢を提案", "電話希望と伝える"]
    : ["要点を聞き返す", "別案件として再分類", "所長へ転送", "後で対応"];
  return (
    <div className="composer">
      <div className="composer-suggestions">
        {suggestions.map(s => (
          <button key={s} className="sugg-chip">
            <span className="ico"><Icon name="spark" size={11} /></span>
            {s}
          </button>
        ))}
      </div>
      <div className="composer-box">
        <textarea
          ref={ta}
          className="composer-input"
          placeholder="返信を入力、または AI に編集を指示…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
        />
        <div className="composer-actions">
          <button className="icon-btn-sm" title="添付"><Icon name="paperclip" size={14} /></button>
          <button className="icon-btn-sm" title="ナレッジ参照"><Icon name="book" size={14} /></button>
          <button className="btn btn-primary" onClick={() => { setText(""); onSend(); }}>
            <Icon name="send" size={12} /> 送信
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>
      <div className="composer-meta">
        <div className="group">
          <span className="item"><Icon name="shield" size={11} /> <b>テナント分離</b> 有効</span>
          <span className="item"><Icon name="clock" size={11} /> 一次対応 <b>2分18秒</b></span>
        </div>
        <span className="item">監査ログ <b>記録中</b></span>
      </div>
    </div>
  );
}

/* sidecar moved to sidecar.jsx — keeping this stub here so the legacy export below stays harmless */
function _LegacySidecar({ inq, highlightedCite, onCiteHover, onCiteLeave }) {
  const sc = SIDECAR[inq.id] || {
    timeline: [
      { time: inq.received, label: "受信", sub: inq.company, state: "done" },
      { time: inq.received, label: "AI分類", sub: `${CATEGORIES[inq.category].jp} · 信頼度 ${Math.round(inq.confidence * 100)}%`, state: inq.draft ? "done" : "now" },
      ...(inq.draft ? [{ time: inq.received, label: "下書き生成", sub: `${inq.citations.length}件参照`, state: "now" }] : []),
      ...(inq.status === "escalated" ? [{ time: "—", label: "所長エスカレーション", sub: "対応待ち", state: "now" }] : []),
      ...(inq.status === "sent"      ? [{ time: inq.received, label: "送信完了", sub: "ナレッジに追加", state: "done" }] : [{ time: "—", label: "送信", sub: "承認待ち", state: "pending" }]),
    ],
    ctx: {
      "顧問先":   inq.company,
      "担当者":   `${inq.contactName} · ${inq.contactRole}`,
      "受信":     inq.receivedFull,
      "カテゴリ": CATEGORIES[inq.category].jp,
      "ステータス": inq.status,
    },
  };

  const pct = Math.round(inq.confidence * 100);

  return (
    <aside className="sidecar">
      <header className="sidecar-head">
        <span className="sidecar-title">AI コンテキスト</span>
        <button className="icon-btn-sm" title="折りたたむ"><Icon name="x" size={13} /></button>
      </header>
      <div className="sidecar-body">

        {/* confidence + classification */}
        <section className="sc-block">
          <div className="sc-block-head"><span>判定</span><span className="meta">{CATEGORIES[inq.category].jp}</span></div>
          <div className="dial">
            <Dial pct={pct} />
            <div className="dial-text">
              <span className="label">CONFIDENCE</span>
              <span className="value">{pct >= 85 ? "高 — 自動送信可" : pct >= 70 ? "中 — 確認推奨" : "低 — レビュー必須"}</span>
              <span className="label" style={{ marginTop: 6 }}>URGENCY</span>
              <span className="value">{inq.urgent ? "至急" : "通常"}</span>
            </div>
          </div>
        </section>

        {/* AI reasoning */}
        <section className="sc-block">
          <div className="sc-block-head"><span>判定理由</span></div>
          <p className="reason">{inq.aiReason.split(/「([^」]+)」/).map((s, i) => i % 2 === 1 ? <em key={i}>「{s}」</em> : <React.Fragment key={i}>{s}</React.Fragment>)}</p>
        </section>

        {/* Sources */}
        {inq.citations.length > 0 && (
          <section className="sc-block">
            <div className="sc-block-head"><span>参照ナレッジ</span><span className="meta">{inq.citations.length}件</span></div>
            <div className="cite-list">
              {inq.citations.map((id, i) => {
                const k = KB[id]; if (!k) return null;
                return (
                  <div key={id}
                    className={`cite-row ${highlightedCite === id ? "active" : ""}`}
                    onMouseEnter={() => onCiteHover(id)}
                    onMouseLeave={onCiteLeave}>
                    <div className="cite-num">{(i + 1).toString().padStart(2, "0")}</div>
                    <div className="cite-content">
                      <div className="cite-title">{k.title}</div>
                      <div className="cite-meta">
                        <span className="src">{k.src}</span>
                        <span className="dot">·</span>
                        <span>{k.section}</span>
                      </div>
                    </div>
                    <div className="cite-score">{(0.78 + (i * 0.04) % 0.2).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="sc-block">
          <div className="sc-block-head"><span>タイムライン</span></div>
          <div className="timeline">
            {sc.timeline.map((row, i) => (
              <div key={i} className={`tl-row ${row.state === "now" ? "now" : ""} ${row.state === "done" ? "active" : ""}`}>
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

        {/* Customer context */}
        <section className="sc-block">
          <div className="sc-block-head"><span>顧客コンテキスト</span></div>
          <div className="ctx-card">
            {Object.entries(sc.ctx).map(([k, v]) => (
              <div key={k} className="ctx-row">
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </aside>
  );
}

/* ---------------------------- thread ---------------------------- */

function Thread({ inq, onSend, sentToast, highlightedCite, setHighlightedCite }) {
  const [editing, setEditing] = useStateT(false);
  const [typing, setTyping] = useStateT(false);
  const prevId = useRefT();
  const bodyRef = useRefT();

  useEffectT(() => {
    if (prevId.current !== inq?.id) {
      setTyping(true);
      const t = setTimeout(() => setTyping(false), 50);
      prevId.current = inq?.id;
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      return () => clearTimeout(t);
    }
  }, [inq?.id]);

  if (!inq) {
    return <div className="thread-col"><div className="empty">問い合わせを選択してください</div></div>;
  }

  const cat = CATEGORIES[inq.category];
  const turns = buildTurnsFromInquiry(inq);
  const isEscalated = inq.status === "escalated";

  return (
    <section className="thread-col" key={inq.id}>
      <header className="thread-head">
        <div className="thread-crumbs">
          <span>受信トレイ</span>
          <span className="sep">/</span>
          <b>{cat.jp}</b>
          <span className="id">{inq.id}</span>
          <div className="actions">
            <button className="icon-btn-sm" title="アーカイブ"><Icon name="archive" size={13} /></button>
            <button className="icon-btn-sm" title="その他"><Icon name="more" size={13} /></button>
          </div>
        </div>
        <h1 className="thread-subject">{inq.subject}</h1>
        <div className="thread-meta">
          <div className="thread-from">
            <div className="pic">{inq.initials}</div>
            <span className="who">{inq.contactName}</span>
            <span className="sep">/</span>
            <span>{inq.contactRole}</span>
            <span className="sep">/</span>
            <span>{inq.company}</span>
          </div>
          <span className="thread-tag">
            <span className="swatch" />
            {cat.jp}
          </span>
          {inq.urgent && <span className="thread-tag" style={{ background: "var(--ink-0)", color: "var(--bg-0)", borderColor: "var(--ink-0)" }}>至急</span>}
        </div>
      </header>

      <div className="thread-body" ref={bodyRef}>
        <span className="thread-rail" />
        {turns.map((turn, i) => {
          if (turn.kind === "incoming") return <IncomingTurn key={i} turn={turn} />;
          if (turn.kind === "outgoing") return <OutgoingTurn key={i} turn={turn} />;
          if (turn.kind === "draft") {
            return (
              <DraftTurn
                key={i} turn={turn} inq={inq}
                highlightedCite={highlightedCite}
                onCiteHover={setHighlightedCite}
                onCiteLeave={() => setHighlightedCite(null)}
                typing={typing && i === turns.length - 1}
                editing={editing}
                onEdit={() => setEditing(e => !e)}
                onSend={() => onSend(inq.id)}
              />
            );
          }
          return null;
        })}

        {isEscalated && (
          <div className="escalate">
            <div>
              <div className="title">所長税理士のレビューを推奨</div>
              <div className="sub">
                {inq.urgent
                  ? "緊急キーワード検出により自動エスカレーション。下書きは初動連絡のみ生成。"
                  : inq.category === "contract"
                    ? "顧問契約カテゴリは全件人間判断必須。下書きは生成されません。"
                    : `信頼度 ${Math.round(inq.confidence * 100)}% は閾値 75% を下回っています。`}
              </div>
            </div>
            <button className="btn-assign">所長へ割当 <Icon name="arrow-right" size={11} /></button>
          </div>
        )}
      </div>

      <Composer inq={inq} onSend={() => onSend(inq.id)} />

      {sentToast && (
        <div className="toast">
          <Icon name="check" size={14} /> 送信完了 — ナレッジに追加されました
        </div>
      )}
    </section>
  );
}

window.Thread = Thread;
