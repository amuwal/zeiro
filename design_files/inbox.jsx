/* global React, CATEGORIES, Icon */
const { useState: useStateInbox, useMemo: useMemoInbox } = React;

function Sidebar({ filter, setFilter, category, setCategory, counts, escalationRate }) {
  const items = [
    { id: "all", label: "受信トレイ", icon: "inbox", count: counts.all },
    { id: "unread", label: "未対応", icon: "alert", count: counts.unread },
    { id: "draft", label: "下書き済", icon: "edit", count: counts.draft },
    { id: "escalated", label: "要レビュー", icon: "flag", count: counts.escalated },
    { id: "sent", label: "送信済", icon: "check", count: counts.sent },
  ];
  const cats = [
    { id: "all", label: "すべて" },
    ...Object.values(CATEGORIES).map(c => ({ id: c.id, label: c.jp, color: c.color })),
  ];
  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-label">フォルダ</div>
        {items.map(it => (
          <button key={it.id} className={`side-item ${filter === it.id ? "active" : ""}`} onClick={() => setFilter(it.id)}>
            <span className="glyph"><Icon name={it.icon} size={14} /></span>
            <span>{it.label}</span>
            <span className="count">{it.count}</span>
          </button>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">カテゴリ</div>
        {cats.map(c => (
          <button key={c.id} className={`side-item ${category === c.id ? "active" : ""}`} onClick={() => setCategory(c.id)}>
            {c.color
              ? <span className="swatch" style={{ background: c.color }} />
              : <span className="glyph"><Icon name="filter" size={13} /></span>}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">担当</div>
        <button className="side-item active">
          <span className="glyph"><Icon name="user" size={13} /></span>
          <span>佐藤 健一</span>
          <span className="count">8</span>
        </button>
        <button className="side-item">
          <span className="glyph"><Icon name="users" size={13} /></span>
          <span>所内全員</span>
          <span className="count">42</span>
        </button>
      </div>

      <div className="escalation-card">
        <div className="escalation-head">
          <span>本日のエスカレーション率</span>
          <span>目標 32%</span>
        </div>
        <div className="escalation-rate">
          <span>{escalationRate}</span>
          <span className="pct">%</span>
        </div>
        <div className="escalation-bar">
          <i style={{ width: `${escalationRate}%` }} />
          <span className="target" style={{ left: `32%` }} />
        </div>
        <div className="escalation-meta">
          <span>{counts.escalated}件 / {counts.all}件</span>
          <span style={{ color: escalationRate <= 37 ? "oklch(45% 0.10 150)" : "var(--urgent)" }}>
            {escalationRate <= 37 ? "正常範囲" : "要調整"}
          </span>
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

function StatusChip({ status }) {
  const map = {
    draft:     { cls: "draft",     label: "下書き済" },
    escalated: { cls: "escalate",  label: "要レビュー" },
    sent:      { cls: "sent",      label: "送信済" },
    pending:   { cls: "",          label: "未対応" },
  };
  const m = map[status] || map.pending;
  return <span className={`status-chip ${m.cls}`}><span className="dot" />{m.label}</span>;
}

function InboxItem({ inq, selected, onClick }) {
  const cat = CATEGORIES[inq.category];
  return (
    <div
      className={`inbox-item ${selected ? "selected" : ""} ${inq.unread ? "unread" : ""} ${inq.urgent ? "urgent" : ""}`}
      onClick={onClick}
    >
      <span className="item-cat" style={{ background: cat.color }} />
      <div className="item-body">
        <div className="item-row1">
          <span className="company">{inq.company}</span>
          {inq.urgent && <span className="urgent-tag">至急</span>}
          <span className="time">{inq.received}</span>
        </div>
        <div className="item-subject">{inq.subject}</div>
        <div className="item-preview">{inq.preview}</div>
        <div className="item-row3">
          <span className="cat-pill" style={{ background: cat.soft, color: cat.color }}>
            <span className="swatch" style={{ background: cat.color }} />
            {cat.jp}
          </span>
          <ConfidenceDots score={inq.confidence} />
          <StatusChip status={inq.status} />
        </div>
      </div>
    </div>
  );
}

function InboxList({ inquiries, selectedId, onSelect, filter, category }) {
  const filtered = useMemoInbox(() => {
    return inquiries.filter(inq => {
      if (filter === "unread" && !inq.unread) return false;
      if (filter === "draft" && inq.status !== "draft") return false;
      if (filter === "escalated" && inq.status !== "escalated") return false;
      if (filter === "sent" && inq.status !== "sent") return false;
      if (category !== "all" && inq.category !== category) return false;
      return true;
    });
  }, [inquiries, filter, category]);

  return (
    <div className="inbox-col">
      <div className="inbox-head">
        <div>
          <div className="inbox-title">受信トレイ</div>
        </div>
        <div className="inbox-meta">{filtered.length} / {inquiries.length}</div>
      </div>
      <div className="inbox-search">
        <Icon name="search" size={14} />
        <input placeholder="顧問先・件名・本文を検索…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="inbox-list anim-stagger" key={filter + category}>
        {filtered.map(inq => (
          <InboxItem key={inq.id} inq={inq} selected={inq.id === selectedId} onClick={() => onSelect(inq.id)} />
        ))}
        {filtered.length === 0 && (
          <div className="empty"><div><div className="ico"><Icon name="inbox" size={16} /></div>該当する問い合わせはありません</div></div>
        )}
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
window.InboxList = InboxList;
window.ConfidenceDots = ConfidenceDots;
window.StatusChip = StatusChip;
