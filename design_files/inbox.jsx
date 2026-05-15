/* global React, CATEGORIES, CHANNELS, LIFECYCLE_STATES, ChannelGlyph, Icon */
const { useState: useStateInbox, useMemo: useMemoInbox, useRef: useRefInbox, useLayoutEffect: useLayoutEffectInbox } = React;

function SidePillList({ children, activeKey }) {
  const wrapRef = useRefInbox(null);
  const [pill, setPill] = React.useState(null);
  useLayoutEffectInbox(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current.querySelector(`[data-key="${activeKey}"]`);
    if (!el) { setPill(null); return; }
    setPill({ top: el.offsetTop, height: el.offsetHeight });
  }, [activeKey, children]);
  return (
    <div className="side-list" ref={wrapRef}>
      {pill && (
        <span
          className="side-pill"
          style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
        />
      )}
      {children}
    </div>
  );
}

function Sidebar({
  filter, setFilter, category, setCategory,
  channel, setChannel, lifecycle, setLifecycle,
  counts, escalationRate,
}) {
  const items = [
    { id: "all",       label: "受信トレイ", icon: "inbox", count: counts.all },
    { id: "unread",    label: "未対応",     icon: "alert", count: counts.unread },
    { id: "draft",     label: "下書き済",   icon: "edit",  count: counts.draft },
    { id: "escalated", label: "要レビュー", icon: "flag",  count: counts.escalated },
    { id: "sent",      label: "送信済",     icon: "check", count: counts.sent },
  ];
  const cats = [
    { id: "all", label: "すべて" },
    ...Object.values(CATEGORIES).map(c => ({ id: c.id, label: c.jp })),
  ];
  const channels = [
    { id: "all", label: "すべてのチャンネル", glyph: "✶" },
    ...Object.values(CHANNELS).map(c => ({ id: c.id, label: c.jp, glyph: c.glyph, count: counts.byChannel?.[c.id] || 0 })),
  ];
  const lifecycles = [
    { id: "all",      label: "すべての状態" },
    { id: "open",     label: LIFECYCLE_STATES.open.jp },
    { id: "awaiting_client", label: LIFECYCLE_STATES.awaiting_client.jp },
    { id: "snoozed",  label: LIFECYCLE_STATES.snoozed.jp },
    { id: "resolved", label: LIFECYCLE_STATES.resolved.jp },
  ];

  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-label">FOLDERS</div>
        <SidePillList activeKey={filter}>
          {items.map(it => (
            <button
              key={it.id} data-key={it.id}
              className={`side-item ${filter === it.id ? "active" : ""}`}
              onClick={() => setFilter(it.id)}
            >
              <span className="glyph"><Icon name={it.icon} size={14} /></span>
              <span>{it.label}</span>
              <span className="count">{it.count}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CHANNELS</div>
        <SidePillList activeKey={channel}>
          {channels.map(c => (
            <button
              key={c.id} data-key={c.id}
              className={`side-item ${channel === c.id ? "active" : ""}`}
              onClick={() => setChannel(c.id)}
            >
              <span className="glyph ch-side">{c.glyph}</span>
              <span>{c.label}</span>
              {c.count > 0 && <span className="count">{c.count}</span>}
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">LIFECYCLE</div>
        <SidePillList activeKey={lifecycle}>
          {lifecycles.map(l => (
            <button
              key={l.id} data-key={l.id}
              className={`side-item ${lifecycle === l.id ? "active" : ""}`}
              onClick={() => setLifecycle(l.id)}
            >
              <span className="glyph"><span className={`lifecycle-dot small ${l.id !== "all" ? "filled" : ""}`} data-state={l.id} /></span>
              <span>{l.label}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CATEGORIES</div>
        <SidePillList activeKey={category}>
          {cats.map(c => (
            <button
              key={c.id} data-key={c.id}
              className={`side-item ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              <span className="swatch" />
              <span>{c.label}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-foot">
        <div className="side-foot-head">
          <span>ESCALATION TODAY</span>
          <span>↗ 32% target</span>
        </div>
        <div className="side-foot-rate">
          {escalationRate}<span className="pct">%</span>
        </div>
        <div className="side-foot-bar">
          <i style={{ width: `${escalationRate}%` }} />
          <span className="target" style={{ left: `32%` }} />
        </div>
        <div className="side-foot-meta">
          <span>{counts.escalated} of {counts.all}</span>
          <span>{escalationRate <= 37 ? "WITHIN RANGE" : "RECALIBRATE"}</span>
        </div>
      </div>
    </aside>
  );
}

function ConfidenceDots({ score }) {
  const filled = score >= 0.85 ? 4 : score >= 0.7 ? 3 : score >= 0.5 ? 2 : 1;
  const cls = score < 0.7 ? "confidence low" : "confidence";
  return (
    <span className={cls}>
      <span className="conf-dots">
        {[0,1,2,3].map(i => <i key={i} className={i < filled ? "on" : ""} />)}
      </span>
      {Math.round(score * 100)}
    </span>
  );
}

function LifecycleChip({ state }) {
  const s = LIFECYCLE_STATES[state] || LIFECYCLE_STATES.open;
  return (
    <span className="lifecycle-chip" data-state={state}>
      <span className="lifecycle-dot" />
      {s.jp}
    </span>
  );
}

function InboxItem({ inq, selected, onClick }) {
  const cat = CATEGORIES[inq.category];
  const ch = CHANNELS[inq.channel || "email"];
  const turnCount = inq.turnCount || 1;
  return (
    <div
      className={`inbox-item ${selected ? "selected" : ""} ${inq.unread ? "unread" : ""}`}
      data-channel={inq.channel || "email"}
      data-cat={inq.category}
      onClick={onClick}
    >
      <div className="item-row1">
        <span className="channel-mark" title={ch.jp}>{ch.glyph}</span>
        <span className="company">{inq.company}</span>
        {turnCount > 1 && <span className="turns-mark">{turnCount}</span>}
        {inq.urgent && <span className="urgent-tag">URGENT</span>}
        <span className="time">{inq.received}</span>
      </div>
      <div className="item-subject">{inq.subject}</div>
      <div className="item-preview">{inq.preview}</div>
      <div className="item-row3">
        <span className="cat-pill" data-cat={inq.category}>
          <span className="swatch" />
          {cat.jp}
        </span>
        <LifecycleChip state={inq.lifecycle || "open"} />
        <ConfidenceDots score={inq.confidence} />
      </div>
    </div>
  );
}

function InboxList({ inquiries, selectedId, onSelect, filter, category, channel, lifecycle }) {
  const filtered = useMemoInbox(() => {
    return inquiries.filter(inq => {
      if (filter === "unread" && !inq.unread) return false;
      if (filter === "draft" && inq.status !== "draft") return false;
      if (filter === "escalated" && inq.status !== "escalated") return false;
      if (filter === "sent" && inq.status !== "sent") return false;
      if (category !== "all" && inq.category !== category) return false;
      if (channel && channel !== "all" && (inq.channel || "email") !== channel) return false;
      if (lifecycle && lifecycle !== "all" && (inq.lifecycle || "open") !== lifecycle) return false;
      return true;
    });
  }, [inquiries, filter, category, channel, lifecycle]);

  return (
    <div className="inbox-col">
      <div className="inbox-head">
        <div className="inbox-title">Inbox<span className="inbox-title-jp">受信トレイ</span></div>
        <div className="inbox-meta">{String(filtered.length).padStart(2, "0")} / {String(inquiries.length).padStart(2, "0")}</div>
      </div>
      <div className="inbox-search">
        <Icon name="search" size={14} />
        <input placeholder="顧問先・件名・本文を検索…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="inbox-list" key={filter + category + channel + lifecycle}>
        {filtered.map((inq, i) => (
          <div
            key={inq.id}
            style={{ animation: `inbox-item-in 420ms cubic-bezier(0.32,0.72,0,1) ${i * 28}ms both` }}
          >
            <InboxItem inq={inq} selected={inq.id === selectedId} onClick={() => onSelect(inq.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty">該当する問い合わせはありません</div>
        )}
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
window.InboxList = InboxList;
window.ConfidenceDots = ConfidenceDots;
window.LifecycleChip = LifecycleChip;
