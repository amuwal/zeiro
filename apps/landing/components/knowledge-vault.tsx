type Doc = {
  code: string;
  src: string;
  title: string;
  sec: string;
};

const KV_DOCS: Doc[] = [
  { code: 'M', src: 'MANUAL', title: '法人税申告書 提出期限の運用', sec: '§ SAMPLE' },
  { code: 'Q', src: 'FAQ', title: '3月決算 申告期限カレンダー', sec: 'Q-SAMPLE' },
  { code: 'C', src: 'CLIENT', title: 'サンプル顧問先 契約特記事項', sec: 'C-SAMPLE' },
  { code: 'L', src: 'LOG', title: '過去回答 — 源泉徴収票 送付', sec: 'DEMO' },
  { code: 'F', src: 'FREEE', title: '会計データ参照（読取専用）', sec: 'READ ONLY' },
];

const KV_STEP = 0.95;
const KV_CYCLE = KV_DOCS.length * KV_STEP;

type IndexStyle = React.CSSProperties & { '--kv-cycle'?: string; '--kv-step'?: string };
type RowStyle = React.CSSProperties & { '--kv-delay'?: string };

export function KnowledgeVault() {
  const indexStyle: IndexStyle = {
    '--kv-cycle': `${KV_CYCLE}s`,
    '--kv-step': `${KV_STEP}s`,
  };
  return (
    <div className="vault">
      <div className="vault-grid" aria-hidden="true" />

      <div className="vault-head" aria-hidden="true">
        <span className="vh-mark">
          <span className="vh-dot" />
          <span className="vh-dot vh-dot-2" />
          <span className="vh-dot vh-dot-3" />
        </span>
        <span className="vh-title">knowledge index</span>
        <span className="vh-divider" />
        <span className="vh-stat">demo · sample sources</span>
        <span className="vh-spacer" />
        <span className="vh-search">
          <span className="vh-search-bar" />
          <span className="vh-search-label">scanning</span>
        </span>
      </div>

      <div className="vault-index" style={indexStyle}>
        {KV_DOCS.map((d, i) => {
          const rowStyle: RowStyle = { '--kv-delay': `${i * KV_STEP - KV_CYCLE}s` };
          return (
            <div className="krow" key={`${d.code}-${d.sec}`} style={rowStyle}>
              <span className="kcode">{d.code}</span>
              <span className="kbody">
                <span className="ktitle">{d.title}</span>
                <span className="ksrc">
                  <span className="ksrc-tag">{d.src}</span>
                  <span className="ksrc-sec">{d.sec}</span>
                  <span className="ksrc-tok">SAMPLE</span>
                </span>
              </span>
              <span className="kstatus">
                <span className="kstatus-idle">SAMPLE</span>
                <span className="kstatus-active">
                  <span className="kstatus-ring" />
                  PREVIEW
                </span>
              </span>
              <span className="krow-beam" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className="vault-base">
        <div>
          <div className="nm">Zeiro / knowledge base</div>
          <div className="sub">sample · source-linked · reviewable</div>
        </div>
        <div className="counter">
          DEMO<span className="unit">DATA</span>
        </div>
      </div>
    </div>
  );
}
