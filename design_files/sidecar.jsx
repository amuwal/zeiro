/* global React, INQUIRIES, CLIENTS, CATEGORIES, KB, CHANNELS, LIFECYCLE_STATES, THREADS, SIDECAR, Icon */
const { useState: useStateSC, useMemo: useMemoSC } = React;

/* ---------------- Channel + lifecycle pill ---------------- */
function ChannelGlyph({ id, size = 16 }) {
  const ch = CHANNELS[id] || CHANNELS.email;
  return (
    <span className="ch-glyph" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {ch.glyph}
    </span>
  );
}

/* ---------------- Suggested action card ---------------- */
function suggestionFor(inq) {
  if (inq.status === "escalated") {
    return {
      verb: "Escalate", jp: "所長へエスカレーション",
      reason: inq.urgent
        ? "「税務調査」キーワードと至急フラグ。所長税理士が初動対応を引き継ぐべきです。"
        : `信頼度 ${Math.round(inq.confidence * 100)}% が閾値を下回り、個別判断が必要なため。`,
      confidence: inq.confidence,
      tone: "warn",
    };
  }
  if (inq.lifecycle === "snoozed") {
    return {
      verb: "Wait", jp: "保留中",
      reason: "別法人設立に関する追加提案を所長が準備中。クライアントへの返答は提案完成後に。",
      confidence: 0.7,
      tone: "muted",
    };
  }
  if (inq.lifecycle === "resolved") {
    return {
      verb: "Resolved", jp: "対応完了",
      reason: "クライアントは満足したと判定されました。アーカイブ可能です。",
      confidence: 0.92,
      tone: "ok",
    };
  }
  if (inq.confidence >= 0.85) {
    return {
      verb: "Send as-is", jp: "下書きそのまま送信",
      reason: `KB ${inq.citations.length}件と過去同種対応にマッチ。署名と本文に修正不要箇所はありません。`,
      confidence: inq.confidence,
      tone: "primary",
    };
  }
  return {
    verb: "Edit & send", jp: "編集して送信",
    reason: "下書きは概ね正確ですが、署名行と日付の最終確認を推奨します。",
    confidence: inq.confidence,
    tone: "secondary",
  };
}

function SuggestedAction({ inq, onSend }) {
  const s = suggestionFor(inq);
  return (
    <div className={`suggest suggest-${s.tone}`}>
      <div className="suggest-head">
        <span className="suggest-label">SUGGESTED ACTION</span>
        <span className="suggest-conf">
          <i style={{ width: `${s.confidence * 100}%` }} />
          {Math.round(s.confidence * 100)}%
        </span>
      </div>
      <div className="suggest-verb">{s.verb} <span className="jp">— {s.jp}</span></div>
      <div className="suggest-reason">{s.reason}</div>
      <div className="suggest-actions">
        <button className="btn btn-secondary"><Icon name="more" size={11} /> 別案</button>
        <button className="btn btn-primary" onClick={() => onSend(inq.id)}>
          <Icon name="arrow-right" size={11} /> {s.verb}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */
function SidecarTabs({ tab, setTab }) {
  const tabs = [
    { id: "insight", label: "Insight" },
    { id: "client",  label: "Client"  },
    { id: "sources", label: "Sources" },
    { id: "activity",label: "Activity"},
  ];
  return (
    <div className="sc-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`sc-tab ${tab === t.id ? "active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Insight tab ---------------- */
function InsightTab({ inq }) {
  const turns = THREADS[inq.id] || [];
  const inboundCount = turns.filter(t => t.kind === "incoming").length || 1;
  const outboundCount = turns.filter(t => t.kind === "outgoing").length;
  const draftPending = turns.some(t => t.kind === "draft");
  const sentiment = inq.urgent ? "至急・不安" : inq.confidence > 0.85 ? "通常・協力的" : "やや慎重";
  const openQs = inq.urgent
    ? ["税務調査の事前準備物を確定する", "面談日時を調整する"]
    : inq.lifecycle === "resolved"
      ? []
      : ["電子提出の必要書類を最終確定する", "顧問契約条項との整合を確認する"];

  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="sc-block-head"><span>会話の状態</span></div>
        <div className="health-grid">
          <div className="health-cell">
            <div className="hc-lbl">往復</div>
            <div className="hc-val">{inboundCount}<span className="sep">/</span>{outboundCount}</div>
            <div className="hc-sub">受信 / 返信</div>
          </div>
          <div className="health-cell">
            <div className="hc-lbl">トーン</div>
            <div className="hc-val small">{sentiment}</div>
            <div className="hc-sub">直近メッセージ</div>
          </div>
          <div className="health-cell">
            <div className="hc-lbl">経過</div>
            <div className="hc-val">2<span className="unit">分18秒</span></div>
            <div className="hc-sub">一次対応</div>
          </div>
        </div>
      </section>

      {openQs.length > 0 && (
        <section className="sc-block">
          <div className="sc-block-head"><span>残るオープン項目</span><span className="meta">{openQs.length}</span></div>
          <div className="open-list">
            {openQs.map((q, i) => (
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
        <p className="reason">
          {inq.aiReason.split(/「([^」]+)」/).map((s, i) =>
            i % 2 === 1 ? <em key={i}>「{s}」</em> : <React.Fragment key={i}>{s}</React.Fragment>
          )}
        </p>
      </section>

      {draftPending && (
        <section className="sc-block">
          <div className="sc-block-head"><span>CSAT</span><span className="soon-pill">SOON</span></div>
          <div className="csat-soon">
            <div className="csat-soon-title">満足度トラッキング</div>
            <div className="csat-soon-sub">
              チャンネル横断（メール、LINE等）でのCSAT測定は順次対応予定。
              現在は再開封率を代替指標として記録しています。
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- Client tab ---------------- */
function ClientTab({ inq, onOpenClient }) {
  const cl = CLIENTS[inq.clientId];
  if (!cl) return <div className="sc-pane"><div className="empty">顧客情報なし</div></div>;
  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="client-snap">
          <div className="client-snap-pic">{cl.initials}</div>
          <div className="client-snap-body">
            <div className="client-snap-name">{cl.company}</div>
            <div className="client-snap-sub">
              {cl.contactName} · {cl.contactRole}
            </div>
            <div className="client-snap-tags">
              {cl.tags.map(t => <span key={t} className="tag-mini">{t}</span>)}
            </div>
          </div>
        </div>
        <button className="open-profile" onClick={() => onOpenClient && onOpenClient(cl.id)}>
          顧客プロファイル全体を開く <Icon name="arrow-right" size={11} />
        </button>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>契約サマリー</span></div>
        <div className="kv-card">
          <div className="kv-line"><span className="k">顧問プラン</span><span className="v">{cl.contract}</span></div>
          <div className="kv-line"><span className="k">月額</span><span className="v mono">¥{cl.monthlyFee.toLocaleString()}</span></div>
          <div className="kv-line"><span className="k">契約開始</span><span className="v mono">{cl.since}</span></div>
          <div className="kv-line"><span className="k">事業年度</span><span className="v">{cl.fiscalYearEnd}決算</span></div>
          <div className="kv-line"><span className="k">業種</span><span className="v">{cl.industry}</span></div>
        </div>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>取引履歴</span></div>
        <div className="stat-row">
          <div className="stat-cell"><div className="stat-num">{cl.lifetimeInquiries}</div><div className="stat-lbl">累計問合せ</div></div>
          <div className="stat-cell"><div className="stat-num">{cl.avgFirstReplyMin}<span className="unit">m</span></div><div className="stat-lbl">平均初動</div></div>
          <div className="stat-cell"><div className="stat-num">{cl.openCount}</div><div className="stat-lbl">未対応</div></div>
        </div>
      </section>

      <section className="sc-block">
        <div className="sc-block-head"><span>担当者メモ</span></div>
        <p className="note-box">{cl.note}</p>
      </section>
    </div>
  );
}

/* ---------------- Sources tab ---------------- */
function SourcesTab({ inq, highlightedCite, onCiteHover, onCiteLeave }) {
  if (!inq.citations || inq.citations.length === 0) {
    return <div className="sc-pane"><div className="empty">参照されたナレッジはありません</div></div>;
  }
  return (
    <div className="sc-pane">
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
                    {k.status !== "fresh" && (
                      <><span className="dot">·</span><span className={`kbstatus ${k.status}`}>{k.status.toUpperCase()}</span></>
                    )}
                  </div>
                </div>
                <div className="cite-score">{(0.78 + (i * 0.04) % 0.2).toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Activity tab ---------------- */
function ActivityTab({ inq }) {
  const sc = SIDECAR[inq.id];
  const fallback = [
    { time: inq.received, label: "受信", sub: inq.company, state: "done" },
    { time: inq.received, label: "AI分類", sub: `${CATEGORIES[inq.category].jp} · 信頼度 ${Math.round(inq.confidence * 100)}%`, state: inq.draft ? "done" : "now" },
    ...(inq.draft ? [{ time: inq.received, label: "下書き生成", sub: `${inq.citations.length}件参照`, state: "now" }] : []),
    ...(inq.lifecycle === "resolved" ? [{ time: inq.received, label: "送信完了", sub: "アーカイブ可能", state: "done" }] : [{ time: "—", label: "送信", sub: "承認待ち", state: "pending" }]),
  ];
  const timeline = sc?.timeline || fallback;
  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="sc-block-head"><span>このスレッドの履歴</span></div>
        <div className="timeline">
          {timeline.map((row, i) => (
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

      <section className="sc-block">
        <div className="sc-block-head"><span>監査ログ</span></div>
        <div className="kv-card">
          <div className="kv-line"><span className="k">チャンネル</span><span className="v">{CHANNELS[inq.channel || "email"].jp}</span></div>
          <div className="kv-line"><span className="k">スレッドID</span><span className="v mono">{inq.id}</span></div>
          <div className="kv-line"><span className="k">テナント分離</span><span className="v">有効</span></div>
          <div className="kv-line"><span className="k">記録</span><span className="v">全イベント保存</span></div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Sidecar shell ---------------- */
function Sidecar({ inq, highlightedCite, onCiteHover, onCiteLeave, onSend, onOpenClient }) {
  const [tab, setTab] = useStateSC("insight");
  if (!inq) return <aside className="sidecar"></aside>;
  return (
    <aside className="sidecar">
      <header className="sidecar-head">
        <div className="sidecar-head-row">
          <span className="sidecar-title">AI コンテキスト</span>
          <span className="lifecycle-pill" data-state={inq.lifecycle}>
            <span className="lifecycle-dot" />
            {LIFECYCLE_STATES[inq.lifecycle]?.jp || inq.lifecycle}
          </span>
        </div>
        <SidecarTabs tab={tab} setTab={setTab} />
      </header>

      <div className="sidecar-pinned">
        <SuggestedAction inq={inq} onSend={onSend} />
      </div>

      <div className="sidecar-body" key={tab}>
        {tab === "insight"  && <InsightTab inq={inq} />}
        {tab === "client"   && <ClientTab inq={inq} onOpenClient={onOpenClient} />}
        {tab === "sources"  && <SourcesTab inq={inq} highlightedCite={highlightedCite} onCiteHover={onCiteHover} onCiteLeave={onCiteLeave} />}
        {tab === "activity" && <ActivityTab inq={inq} />}
      </div>
    </aside>
  );
}

window.Sidecar = Sidecar;
window.ChannelGlyph = ChannelGlyph;
