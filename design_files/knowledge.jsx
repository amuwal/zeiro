/* global React, KB, Icon */

function KnowledgeTab() {
  const entries = Object.entries(KB);
  const total = entries.length;
  const fresh = entries.filter(([, v]) => v.status === "fresh").length;
  const review = entries.filter(([, v]) => v.status === "review").length;
  const outdated = entries.filter(([, v]) => v.status === "outdated").length;

  const badgeMap = {
    fresh: { cls: "fresh", label: "最新" },
    review: { cls: "review", label: "要確認" },
    outdated: { cls: "outdated", label: "法改正" },
  };

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">ナレッジベース</div>
          <div className="kb-sub">事務所固有のFAQ・マニュアル・過去回答 — 全{total}件</div>
        </div>
        <div className="btn-cluster">
          <button className="btn btn-secondary"><Icon name="filter" size={13} /> フィルタ</button>
          <button className="btn btn-primary"><Icon name="edit" size={13} /> 新規追加</button>
        </div>
      </div>

      <div className="kb-stats">
        <div className="kb-stat">
          <span className="lbl">総件数</span>
          <span className="num">{total}</span>
          <span className="delta up">+12 今月</span>
        </div>
        <div className="kb-stat">
          <span className="lbl">最新</span>
          <span className="num" style={{ color: "oklch(38% 0.06 150)" }}>{fresh}</span>
          <span className="delta">{Math.round(fresh / total * 100)}%</span>
        </div>
        <div className="kb-stat">
          <span className="lbl">要確認</span>
          <span className="num" style={{ color: "oklch(45% 0.10 70)" }}>{review}</span>
          <span className="delta">所内レビュー待ち</span>
        </div>
        <div className="kb-stat">
          <span className="lbl">法改正影響</span>
          <span className="num" style={{ color: "var(--urgent)" }}>{outdated}</span>
          <span className="delta">強制レビュー対象</span>
        </div>
      </div>

      <div className="kb-table">
        <div className="kb-row head">
          <span>タイトル</span>
          <span>出典</span>
          <span>使用回数</span>
          <span>更新日</span>
          <span>状態</span>
        </div>
        {entries.map(([id, k]) => {
          const b = badgeMap[k.status];
          return (
            <div className="kb-row" key={id}>
              <div>
                <div className="doc-title">{k.title}</div>
                <div className="doc-sub" style={{ fontFamily: "var(--font-mono)" }}>{id} · {k.section}</div>
              </div>
              <span style={{ color: "var(--ink-2)" }}>{k.src}</span>
              <span className="uses">{k.uses}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--muted)" }}>{k.updated}</span>
              <span><span className={`kb-flag ${b.cls}`}>{b.label}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.KnowledgeTab = KnowledgeTab;
