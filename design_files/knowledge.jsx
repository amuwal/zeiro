/* global React, KB, Icon */
const { useState: useStateKB, useMemo: useMemoKB } = React;

const BADGES = {
  fresh:    { cls: "fresh",    label: "最新"   },
  review:   { cls: "review",   label: "要確認" },
  outdated: { cls: "outdated", label: "法改正" },
  draft:    { cls: "draft",    label: "下書き" },
};

function KnowledgeTab() {
  const [view, setView] = useStateKB("all"); // all | review | outdated | fresh
  const entries = Object.entries(KB);
  const total = entries.length;
  const fresh = entries.filter(([, v]) => v.status === "fresh").length;
  const review = entries.filter(([, v]) => v.status === "review").length;
  const outdated = entries.filter(([, v]) => v.status === "outdated").length;

  const filtered = useMemoKB(() => {
    if (view === "all") return entries;
    return entries.filter(([, v]) => v.status === view);
  }, [view, entries]);

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">ナレッジベース</div>
          <div className="kb-sub">事務所固有のFAQ・マニュアル・過去回答 — 全{total}件</div>
        </div>
        <div className="btn-cluster">
          <button className="btn btn-secondary"><Icon name="filter" size={13} /> インポート</button>
          <button className="btn btn-primary"><Icon name="edit" size={13} /> 新規追加</button>
        </div>
      </div>

      <div className="kb-stats">
        <button
          className={`kb-stat clickable ${view === "all" ? "active" : ""}`}
          onClick={() => setView("all")}>
          <span className="lbl">総件数</span>
          <span className="num">{total}</span>
          <span className="delta up">+12 今月</span>
        </button>
        <button
          className={`kb-stat clickable ${view === "fresh" ? "active" : ""}`}
          onClick={() => setView("fresh")}>
          <span className="lbl">最新</span>
          <span className="num">{fresh}</span>
          <span className="delta">{Math.round(fresh / total * 100)}% を占める</span>
        </button>
        <button
          className={`kb-stat clickable ${view === "review" ? "active" : ""}`}
          onClick={() => setView("review")}>
          <span className="lbl">要レビュー</span>
          <span className="num">{review}</span>
          <span className="delta">所内承認待ち</span>
        </button>
        <button
          className={`kb-stat clickable urgent ${view === "outdated" ? "active" : ""}`}
          onClick={() => setView("outdated")}>
          <span className="lbl">法改正影響</span>
          <span className="num">{outdated}</span>
          <span className="delta">強制レビュー対象</span>
        </button>
      </div>

      {(view === "review" || view === "outdated") && (
        <div className="review-banner">
          <div className="rb-glyph"><Icon name={view === "outdated" ? "alert" : "flag"} size={14} /></div>
          <div className="rb-body">
            <div className="rb-title">
              {view === "outdated"
                ? "法改正により再確認が必要なナレッジ"
                : "所内レビュー待ち"}
            </div>
            <div className="rb-sub">
              {view === "outdated"
                ? "下記のナレッジは古い税法に基づいています。AI下書きへの参照を停止し、新版を作成してください。"
                : "新規・編集されたナレッジを承認するとAIが利用を開始します。"}
            </div>
          </div>
          <button className="btn btn-primary">
            一括対応 <Icon name="arrow-right" size={11} />
          </button>
        </div>
      )}

      <div className="kb-table" key={view}>
        <div className="kb-row head">
          <span>タイトル</span>
          <span>出典</span>
          <span>使用回数</span>
          <span>更新日</span>
          <span>状態</span>
        </div>
        {filtered.map(([id, k], i) => {
          const b = BADGES[k.status] || BADGES.fresh;
          return (
            <div
              className={`kb-row ${k.status === "outdated" ? "row-warn" : ""}`}
              key={id}
              style={{ animation: `inbox-item-in 360ms cubic-bezier(0.32,0.72,0,1) ${i * 18}ms both` }}
            >
              <div>
                <div className="doc-title">{k.title}</div>
                <div className="doc-sub mono">{id} · {k.section}</div>
              </div>
              <span style={{ color: "var(--ink-2)" }}>{k.src}</span>
              <span className="uses">{k.uses}</span>
              <span className="mono dim">{k.updated}</span>
              <span><span className={`kb-flag ${b.cls}`}>{b.label}</span></span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty">該当するナレッジはありません</div>
        )}
      </div>
    </div>
  );
}

window.KnowledgeTab = KnowledgeTab;
