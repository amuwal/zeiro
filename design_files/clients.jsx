/* global React, CLIENTS, INQUIRIES, CATEGORIES, CHANNELS, LIFECYCLE_STATES, Icon */
const { useState: useStateCl, useMemo: useMemoCl } = React;

function clientStatus(c) {
  if ((c.openCount || 0) >= 3) return { tone: "warn",  label: "ATTENTION" };
  if ((c.openCount || 0) >= 1) return { tone: "live",  label: "ACTIVE"    };
  return                              { tone: "calm",  label: "STEADY"    };
}

// Best-effort enrichment from related inquiries when data.jsx didn't supply
// contact/channel fields directly on the client record.
function enrich(c) {
  if (!c) return null;
  const own = INQUIRIES.filter(i => i.clientId === c.id);
  const first = own[0] || {};
  return {
    id: c.id,
    company: c.company || "—",
    initials: c.initials || (c.company || "C").slice(0, 2),
    industry: c.industry || "—",
    contactName: c.contactName || first.contactName || "—",
    contactRole: c.contactRole || first.contactRole || "担当者",
    contract: c.contract || "—",
    contractRange: c.contractRange || (c.since ? `${c.since} 〜 現在` : "—"),
    monthlyFee: c.monthlyFee || 0,
    since: c.since || "—",
    fiscalYearEnd: c.fiscalYearEnd || "—",
    founded: c.founded || c.since || "—",
    employees: c.employees ?? "—",
    lifetimeInquiries: c.lifetimeInquiries || own.length,
    avgFirstReplyMin: c.avgFirstReplyMin || 0,
    aiHandledPct: c.aiHandledPct ?? Math.min(90, 60 + Math.floor((c.lifetimeInquiries || 0) / 4)),
    openCount: c.openCount || own.filter(i => (i.lifecycle || "open") !== "resolved").length,
    tags: c.tags || [],
    channels: c.channels || Array.from(new Set(own.map(i => i.channel || "email"))),
    note: c.note || "メモはまだ登録されていません。",
    milestones: c.milestones || [
      { date: c.since || "—", label: "顧問契約開始" },
      ...(own[0] ? [{ date: (own[0].receivedFull || "").slice(0, 10), label: own[0].subject }] : []),
    ],
  };
}

function ClientsList({ selectedId, onSelect, search, setSearch }) {
  const list = useMemoCl(() => {
    const all = Object.values(CLIENTS);
    if (!search) return all;
    const s = search.toLowerCase();
    return all.filter(c =>
      (c.company || "").toLowerCase().includes(s) ||
      (c.contactName || "").toLowerCase().includes(s) ||
      (c.industry || "").toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <div className="clients-list-col">
      <div className="inbox-head">
        <div className="inbox-title">Clients<span className="inbox-title-jp">顧問先</span></div>
        <div className="inbox-meta">{String(list.length).padStart(2, "0")} / {String(Object.keys(CLIENTS).length).padStart(2, "0")}</div>
      </div>
      <div className="inbox-search">
        <Icon name="search" size={14} />
        <input
          placeholder="法人名・担当者・業種で検索…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <kbd>⌘K</kbd>
      </div>
      <div className="clients-list">
        <div className="clients-list-head">
          <span style={{ flex: "0 0 28px" }}></span>
          <span style={{ flex: 2.4 }}>顧問先</span>
          <span style={{ flex: 1 }}>状態</span>
          <span style={{ flex: 0.7, textAlign: "right" }}>未対応</span>
          <span style={{ flex: 1, textAlign: "right" }}>初動 (m)</span>
        </div>
        {list.map((c, i) => {
          const st = clientStatus(c);
          const e = enrich(c);
          return (
            <button
              key={c.id}
              className={`client-row ${selectedId === c.id ? "selected" : ""}`}
              onClick={() => onSelect(c.id)}
              style={{ animation: `inbox-item-in 380ms cubic-bezier(0.32,0.72,0,1) ${i * 22}ms both` }}
            >
              <div className="client-avatar" style={{ flex: "0 0 28px" }}>{e.initials}</div>
              <div style={{ flex: 2.4, minWidth: 0 }}>
                <div className="client-name">{e.company}</div>
                <div className="client-sub">{e.contactName} · {e.industry}</div>
              </div>
              <div style={{ flex: 1 }}>
                <span className={`client-state ${st.tone}`}><i />{st.label}</span>
              </div>
              <div style={{ flex: 0.7, textAlign: "right" }} className="mono num-open">{e.openCount}</div>
              <div style={{ flex: 1, textAlign: "right" }} className="mono">{e.avgFirstReplyMin}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClientProfile({ client, onOpenInquiry }) {
  if (!client) {
    return <div className="client-profile"><div className="empty">顧問先を選択してください</div></div>;
  }
  const c = enrich(client);
  const inquiries = INQUIRIES.filter(i => i.clientId === c.id);
  const open = inquiries.filter(i => (i.lifecycle || "open") !== "resolved");
  const resolved = inquiries.filter(i => (i.lifecycle || "open") === "resolved");

  return (
    <div className="client-profile" key={c.id}>
      <header className="cp-head">
        <div className="cp-head-row">
          <div className="cp-avatar">{c.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cp-crumbs"><span>顧問先</span><span className="sep">/</span><b>{c.industry}</b></div>
            <h1 className="cp-name">{c.company}</h1>
            <div className="cp-sub">
              {c.contactName} · {c.contactRole}
              <span className="sep">/</span>
              {c.contractRange}
              <span className="sep">/</span>
              {c.fiscalYearEnd}決算
            </div>
            <div className="cp-tags">
              {c.tags.map(t => <span key={t} className="tag-mini">{t}</span>)}
            </div>
          </div>
          <div className="cp-actions">
            <button className="btn btn-secondary"><Icon name="edit" size={12} /> 編集</button>
            <button className="btn btn-primary"><Icon name="send" size={12} /> 新規連絡</button>
          </div>
        </div>

        <div className="cp-stats">
          <div className="cp-stat"><div className="cp-stat-num">{c.lifetimeInquiries}</div><div className="cp-stat-lbl">累計問合せ</div></div>
          <div className="cp-stat"><div className="cp-stat-num">{c.avgFirstReplyMin}<span className="unit">m</span></div><div className="cp-stat-lbl">平均初動</div></div>
          <div className="cp-stat"><div className="cp-stat-num">{c.aiHandledPct}<span className="unit">%</span></div><div className="cp-stat-lbl">AI対応率</div></div>
          <div className="cp-stat"><div className="cp-stat-num">{open.length}</div><div className="cp-stat-lbl">未対応</div></div>
          <div className="cp-stat csat-soon-stat">
            <div className="cp-stat-num soon"><span>—</span><span className="soon-pill">SOON</span></div>
            <div className="cp-stat-lbl">CSAT</div>
          </div>
        </div>
      </header>

      <div className="cp-grid">
        <section className="cp-pane">
          <div className="cp-pane-head"><span>未対応スレッド</span><span className="meta">{open.length}件</span></div>
          {open.length === 0 ? (
            <div className="empty-mini">未対応はありません</div>
          ) : open.map(i => (
            <button key={i.id} className="cp-thread" onClick={() => onOpenInquiry && onOpenInquiry(i.id)}>
              <div className="cp-thread-l">
                <span className="ch-mini">{(CHANNELS[i.channel || "email"] || {}).glyph || "✉"}</span>
                <div>
                  <div className="cp-thread-subj">{i.subject}</div>
                  <div className="cp-thread-meta">
                    <span>{(CATEGORIES[i.category] || {}).jp || i.category}</span>
                    <span className="sep">·</span>
                    <span>{i.received}</span>
                    {i.turnCount > 1 && <><span className="sep">·</span><span>{i.turnCount}往復</span></>}
                  </div>
                </div>
              </div>
              <span className="lifecycle-chip" data-state={i.lifecycle || "open"}>
                <span className="lifecycle-dot" />
                {(LIFECYCLE_STATES[i.lifecycle || "open"] || {}).jp || i.lifecycle}
              </span>
            </button>
          ))}

          {resolved.length > 0 && (
            <>
              <div className="cp-pane-head" style={{ marginTop: 18 }}>
                <span>完了スレッド</span><span className="meta">{resolved.length}件</span>
              </div>
              {resolved.map(i => (
                <button key={i.id} className="cp-thread resolved" onClick={() => onOpenInquiry && onOpenInquiry(i.id)}>
                  <div className="cp-thread-l">
                    <span className="ch-mini">{(CHANNELS[i.channel || "email"] || {}).glyph || "✉"}</span>
                    <div>
                      <div className="cp-thread-subj">{i.subject}</div>
                      <div className="cp-thread-meta">
                        <span>{(CATEGORIES[i.category] || {}).jp || i.category}</span>
                        <span className="sep">·</span>
                        <span>{i.received}</span>
                      </div>
                    </div>
                  </div>
                  <span className="lifecycle-chip" data-state="resolved">
                    <span className="lifecycle-dot" />完了
                  </span>
                </button>
              ))}
            </>
          )}
        </section>

        <section className="cp-pane">
          <div className="cp-pane-head"><span>契約・基本情報</span></div>
          <div className="kv-card">
            <div className="kv-line"><span className="k">顧問プラン</span><span className="v">{c.contract}</span></div>
            <div className="kv-line"><span className="k">月額顧問料</span><span className="v mono">¥{Number(c.monthlyFee).toLocaleString()}</span></div>
            <div className="kv-line"><span className="k">契約開始</span><span className="v mono">{c.since}</span></div>
            <div className="kv-line"><span className="k">事業年度</span><span className="v">{c.fiscalYearEnd}決算</span></div>
            <div className="kv-line"><span className="k">業種</span><span className="v">{c.industry}</span></div>
            <div className="kv-line"><span className="k">設立</span><span className="v mono">{c.founded}</span></div>
            <div className="kv-line"><span className="k">従業員</span><span className="v mono">{c.employees}</span></div>
          </div>

          <div className="cp-pane-head" style={{ marginTop: 18 }}><span>利用チャンネル</span></div>
          <div className="channel-list">
            {c.channels.map(ch => {
              const cm = CHANNELS[ch] || {};
              return (
                <div key={ch} className="channel-row">
                  <span className="ch-glyph-lg">{cm.glyph || "✉"}</span>
                  <span>{cm.jp || ch}</span>
                  <span className="mono dim">{cm.addr || "—"}</span>
                </div>
              );
            })}
          </div>

          <div className="cp-pane-head" style={{ marginTop: 18 }}><span>担当者メモ</span></div>
          <p className="note-box">{c.note}</p>

          <div className="cp-pane-head" style={{ marginTop: 18 }}><span>節目イベント</span></div>
          <div className="milestones">
            {c.milestones.map((m, i) => (
              <div key={i} className="milestone-row">
                <span className="m-date mono">{m.date}</span>
                <span className="m-dot" />
                <span className="m-label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ClientsTab({ onOpenInquiry }) {
  const ids = Object.keys(CLIENTS);
  const [selectedId, setSelectedId] = useStateCl(ids[0]);
  const [search, setSearch] = useStateCl("");
  return (
    <div className="workspace clients-workspace">
      <ClientsList selectedId={selectedId} onSelect={setSelectedId} search={search} setSearch={setSearch} />
      <ClientProfile client={CLIENTS[selectedId]} onOpenInquiry={onOpenInquiry} />
    </div>
  );
}

window.ClientsTab = ClientsTab;
