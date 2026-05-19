type Doc = {
  code: string;
  src: string;
  title: string;
  sec: string;
  tokens: number;
};

const KV_DOCS: Doc[] = [
  { code: 'M', src: 'MANUAL', title: '法人税申告書 提出期限の運用', sec: '§ 4.2', tokens: 1284 },
  { code: 'Q', src: 'FAQ', title: '3月決算 申告期限カレンダー', sec: 'Q-018', tokens: 742 },
  { code: 'C', src: 'CLIENT', title: '山田商事 顧問契約 特記事項', sec: 'C-0142', tokens: 186 },
  { code: 'L', src: 'LOG', title: '過去回答 — 源泉徴収票 送付', sec: '2025-11', tokens: 912 },
  { code: 'N', src: 'NTA', title: '国税庁通達 — 役員報酬期中改定', sec: '11-4', tokens: 2148 },
  { code: 'M', src: 'MANUAL', title: 'e-Tax 電子提出 優先運用ガイド', sec: '§ 6.1', tokens: 608 },
  { code: 'P', src: 'POLICY', title: '税務調査 初動対応プロトコル', sec: 'S-01', tokens: 431 },
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
        <span className="vh-stat">live · 11 sources</span>
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
            <div className="krow" key={`${d.code}-${d.sec}-${i}`} style={rowStyle}>
              <span className="kcode">{d.code}</span>
              <span className="kbody">
                <span className="ktitle">{d.title}</span>
                <span className="ksrc">
                  <span className="ksrc-tag">{d.src}</span>
                  <span className="ksrc-sec">{d.sec}</span>
                  <span className="ksrc-tok">{d.tokens.toLocaleString()} tok</span>
                </span>
              </span>
              <span className="kstatus">
                <span className="kstatus-idle">INDEXED</span>
                <span className="kstatus-active">
                  <span className="kstatus-ring" />
                  INDEXING
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
          <div className="sub">indexed · embedded · cited</div>
        </div>
        <div className="counter">
          10,847<span className="unit">vec</span>
        </div>
      </div>
    </div>
  );
}
