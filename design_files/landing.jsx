/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

/* =========================================================
   Reveal-on-scroll hook
   ========================================================= */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* =========================================================
   TOP BAR
   ========================================================= */
function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`topbar ${scrolled ? "scrolled" : ""}`}>
      <div className="topbar-inner">
        <a className="brand" href="#top">
          <span className="brand-mark">z</span>
          <span>zeiro</span>
          <span className="brand-tag">tax-office agent</span>
        </a>
        <nav className="nav">
          <a href="#channels">チャネル</a>
          <a href="#knowledge">ナレッジ</a>
          <a href="#citations">引用</a>
          <a href="#confidence">信頼度</a>
          <a href="#memory">メモリ</a>
          <a href="#numbers">実績</a>
        </nav>
        <div className="nav-actions">
          <a className="btn btn-ghost" href="index.html">ログイン</a>
          <a className="btn btn-solid" href="#cta">
            事務所と話す
            <span className="arrow" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   HERO + LIVE DEMO
   ========================================================= */
function HeroDemo() {
  // The whole thing is a CSS animation loop driven by keyframes.
  return (
    <div className="hero-demo">
      <div className="demo-stage" aria-hidden="true">
        <div className="demo-bar">
          <span className="dots"><i /><i /><i /></span>
          <span className="label">INBOX · LIVE</span>
          <span className="step">
            <span className="ring" />
            agent · processing
          </span>
        </div>

        <div className="demo-body">
          {/* Incoming card */}
          <div className="demo-incoming">
            <span className="channel">EMAIL</span>
            <span className="who">山田 正彦 · 株式会社山田商事</span>
            <span className="time">10:42</span>
            <span className="subject">3月決算法人税の申告期限について確認させてください</span>
            <span className="preview">いつもお世話になっております。本年度の法人税申告ですが、提出期限と納付期限について…</span>
          </div>

          {/* classify pill */}
          <div className="demo-classify">
            <span>分類</span>
            <span className="arrow" />
            <span className="classify-pill">
              期日確認
              <span className="conf">conf 0.94</span>
            </span>
            <span className="arrow" />
            <span>下書き生成</span>
          </div>

          {/* AI draft */}
          <div className="demo-draft">
            <div className="demo-draft-head">
              <span className="badge">AI · v2</span>
              <span>下書き</span>
              <span className="gen-ms">generated · 1.2s</span>
            </div>
            <div className="demo-draft-text">
              <span className="l l1">山田 正彦様、いつもお世話になっております。</span>
              <span className="l l2">3月決算ですので、<b>提出期限は 2026年5月31日</b>。<span className="cite c1">kb-001</span></span>
              <span className="l l3">e-Tax電子提出をご希望とのこと、承知いたしました。<span className="cite c2">kb-005</span></span>
              <span className="l l4">事前確認ドラフトは5月20日にお送りします。<span className="cite c3">kb-003</span></span>
            </div>
            <div className="demo-draft-foot">
              <span className="ok"><span className="dot" /> 送信準備完了</span>
              <span className="send">送信 ↵</span>
            </div>
          </div>

          {/* background stream of other arrivals */}
          <div className="demo-stream">
            <div className="stream-row">
              <span className="chan">LINE</span>
              <span className="sub">税務調査の事前通知が来ました — 鈴木代表</span>
              <span className="t">10:21</span>
            </div>
            <div className="stream-row">
              <span className="chan">FORM</span>
              <span className="sub">源泉徴収票の送付先について — 田中様</span>
              <span className="t">09:58</span>
            </div>
            <div className="stream-row">
              <span className="chan">EMAIL</span>
              <span className="sub">消費税の中間納付スケジュール — 鈴木建設</span>
              <span className="t">08:47</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero container" id="top">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="badge">α</span>
            <span>税理士事務所のための</span>
            <span className="pulse" />
          </div>

          <h1>
            <span className="line"><span>顧客対応を、</span></span>
            <span className="line"><span><em>自動で</em>。</span></span>
            <span className="line"><span>所長は<span className="ink-light">監督に</span>。</span></span>
          </h1>

          <p className="hero-sub">
            メール・LINE・Webフォームに届く問い合わせを、<b>事務所のマニュアル・FAQ・顧問先情報・過去回答</b>で自動下書き。
            <br />引用付き。信頼度判定付き。低信頼の案件は所長へ自動エスカレーション。
          </p>

          <div className="hero-cta-row">
            <a className="btn btn-solid btn-lg" href="#cta">
              事務所を接続する
              <span className="arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
              </span>
            </a>
            <a className="btn btn-line btn-lg" href="index.html">
              プロダクトを試す
              <span className="kbd" style={{ color: "var(--ink-3)", borderColor: "var(--line)" }}>D</span>
            </a>
          </div>

          <div className="hero-microstats">
            <div className="hero-microstat">
              <div className="v">73<span className="unit">%</span></div>
              <div className="l">自動回答率</div>
            </div>
            <div className="hero-microstat">
              <div className="v">22<span className="unit">min</span></div>
              <div className="l">平均初回返答</div>
            </div>
            <div className="hero-microstat">
              <div className="v">100<span className="unit">%</span></div>
              <div className="l">引用付き下書き</div>
            </div>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}

/* =========================================================
   MARQUEE
   ========================================================= */
function Marquee() {
  const items = [
    "メール (IMAP)",
    "Gmail",
    "Microsoft 365",
    "LINE 公式アカウント",
    "Chatwork",
    "Slack Connect",
    "Webフォーム",
    "SMS",
    "電話 文字起こし",
    "国税庁 通達",
    "TKC FX",
    "freee",
    "弥生",
    "MFクラウド",
  ];
  // duplicate for seamless loop
  const loop = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-label">取り込み元</div>
      <div className="marquee-track">
        {loop.map((s, i) => (
          <span className="marquee-item" key={i}>
            {s}<span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION 1 — CHANNELS UNIFY (constellation)
   ========================================================= */
const CC_VB_W = 700;
const CC_VB_H = 560;
const CC_HUB = { x: 350, y: 280, r: 64 };
const CC_CYCLE = 3.33; // seconds for one packet to travel (20% faster)
const CC_STAGGER = 0.58;

const CC_CHANNELS = [
  { id: "email", glyph: "@", label: "Email",      meta: "IMAP",        ax: 132, ay: 102, pos: "tl" },
  { id: "line",  glyph: "L", label: "LINE 公式",   meta: "BOT",         ax: 568, ay: 128, pos: "tr" },
  { id: "phone", glyph: "P", label: "電話",        meta: "文字起こし",  ax: 168, ay: 280, pos: "ml" },
  { id: "web",   glyph: "F", label: "Webフォーム", meta: "埋込",        ax: 138, ay: 458, pos: "bl" },
  { id: "chat",  glyph: "C", label: "Chatwork",   meta: "API",         ax: 562, ay: 444, pos: "br" },
];

function ccBuildWire(c) {
  const dx = CC_HUB.x - c.ax;
  const dy = CC_HUB.y - c.ay;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  // wire starts a hair outside the card corner toward the hub
  const sx = c.ax + ux * 4;
  const sy = c.ay + uy * 4;
  // wire ends right at the hub edge
  const ex = CC_HUB.x - ux * CC_HUB.r;
  const ey = CC_HUB.y - uy * CC_HUB.r;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  // bend perpendicular to give the wire a graceful arc
  const perpX = -uy;
  const perpY = ux;
  const curve = c.pos === "ml" ? 0 : 22;
  const cx = mx + perpX * curve;
  const cy = my + perpY * curve;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function ChannelConstellation() {
  const wires = useMemo(() => CC_CHANNELS.map((c, i) => ({
    ...c,
    d: ccBuildWire(c),
    delay: i * CC_STAGGER,
  })), []);

  const hubLeftPct = (CC_HUB.x / CC_VB_W) * 100;
  const hubTopPct = (CC_HUB.y / CC_VB_H) * 100;
  const hubWidthPct = (CC_HUB.r * 2 / CC_VB_W) * 100;

  // three ripple offsets so the hub absorbs continuously, syncing with the stagger
  const ripples = [0, CC_STAGGER, CC_STAGGER * 2];

  return (
    <div className="constellation">
      <div className="cc-grid" aria-hidden="true" />
      <div className="cc-aura" aria-hidden="true" />

      <svg
        className="cc-svg"
        viewBox={`0 0 ${CC_VB_W} ${CC_VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cc-hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(10,10,10,0.16)" />
            <stop offset="55%" stopColor="rgba(10,10,10,0.04)" />
            <stop offset="100%" stopColor="rgba(10,10,10,0)" />
          </radialGradient>
          <linearGradient id="cc-wire-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(10,10,10,0)" />
            <stop offset="0.25" stopColor="rgba(10,10,10,0.28)" />
            <stop offset="1" stopColor="rgba(10,10,10,0.28)" />
          </linearGradient>
          <radialGradient id="cc-packet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0A0A0A" />
            <stop offset="55%" stopColor="#0A0A0A" />
            <stop offset="100%" stopColor="rgba(10,10,10,0)" />
          </radialGradient>
        </defs>

        {/* hub halo + concentric guides */}
        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={210} fill="url(#cc-hub-glow)" />
        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={CC_HUB.r + 28} className="cc-guide" />
        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={CC_HUB.r + 64} className="cc-guide cc-guide-2" />

        {/* hub absorb ripples — staggered to feel like continuous intake */}
        {ripples.map((delay, i) => (
          <circle key={i} cx={CC_HUB.x} cy={CC_HUB.y} className="cc-ripple">
            <animate
              attributeName="r"
              from={CC_HUB.r}
              to={CC_HUB.r + 46}
              dur={`${CC_STAGGER * 3}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.35;0"
              keyTimes="0;1"
              dur={`${CC_STAGGER * 3}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* wires */}
        {wires.map((w) => (
          <path key={`w-${w.id}`} id={`cc-wire-${w.id}`} d={w.d} className="cc-wire" />
        ))}

        {/* packets — each travels its own wire on a staggered loop */}
        {wires.map((w) => (
          <g key={`p-${w.id}`}>
            <circle r="5" className="cc-packet" fill="url(#cc-packet)">
              <animateMotion
                dur={`${CC_CYCLE}s`}
                begin={`${w.delay}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#cc-wire-${w.id}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.88;1"
                dur={`${CC_CYCLE}s`}
                begin={`${w.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>

      {/* hub — sits above the SVG so wire endpoints disappear cleanly under it */}
      <div
        className="cc-hub"
        style={{
          left: `${hubLeftPct}%`,
          top: `${hubTopPct}%`,
          width: `${hubWidthPct}%`,
        }}
      >
        <span className="cc-hub-name">zeiro</span>
        <span className="cc-hub-tag">UNIFIED INBOX</span>
      </div>

      {/* channel cards — corner-anchored to the wire start point */}
      {wires.map((c) => (
        <div
          key={c.id}
          className={`cc-node cc-node-${c.pos}`}
          style={{
            left: `${(c.ax / CC_VB_W) * 100}%`,
            top: `${(c.ay / CC_VB_H) * 100}%`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <span className="cc-glyph">{c.glyph}</span>
          <span className="cc-label">{c.label}</span>
          <span className="cc-meta">{c.meta}</span>
        </div>
      ))}
    </div>
  );
}

function ChannelsSection() {
  const ref = useReveal();
  return (
    <section className="section channels" id="channels">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">01</span>
            <span>受信を、ひとつに。</span>
          </div>
          <h2 className="section-title">
            メール、LINE、フォーム。<br />
            <em>すべての連絡を</em>ひとつの受信トレイへ。
          </h2>
          <p className="section-lede">
            顧問先からの問い合わせは、毎日 <b>5つ以上のチャネル</b> に散らばっている。zeiro はそれらを取り込み、
            同じ顧問先・同じ案件として<b>自動で名寄せ</b>します。担当者は、もうタブを切り替えなくていい。
          </p>
        </div>

        <div className="channels-stage">
          <ChannelConstellation />

          <div className="channels-bullets">
            <div className="bullet">
              <span className="num">— A</span>
              <div>
                <h3>顧問先で自動名寄せ</h3>
                <p>メールアドレス、電話番号、LINE ID、過去履歴を突合。3チャネルから同じ案件として届いても <code>INQ-2026-0418</code> の1スレッドにまとまります。</p>
              </div>
            </div>
            <div className="bullet">
              <span className="num">— B</span>
              <div>
                <h3>カテゴリ自動分類</h3>
                <p>「期日確認」「書類提出」「税務質問」「顧問契約」「その他」。事務所内の運用ルールで閾値を調整可能。</p>
              </div>
            </div>
            <div className="bullet">
              <span className="num">— C</span>
              <div>
                <h3>送信元のプロトコルは問わない</h3>
                <p>添付PDF、画像、LINEスタンプ、フォームの構造化フィールド、すべて統一フォーマットでスレッドに格納。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 2 — KNOWLEDGE INGESTION
   ========================================================= */
const KV_DOCS = [
  { code: "M", src: "MANUAL",  title: "法人税申告書 提出期限の運用",   sec: "§ 4.2",   tokens: 1284 },
  { code: "Q", src: "FAQ",     title: "3月決算 申告期限カレンダー",     sec: "Q-018",   tokens:  742 },
  { code: "C", src: "CLIENT",  title: "山田商事 顧問契約 特記事項",     sec: "C-0142",  tokens:  186 },
  { code: "L", src: "LOG",     title: "過去回答 — 源泉徴収票 送付",     sec: "2025-11", tokens:  912 },
  { code: "N", src: "NTA",     title: "国税庁通達 — 役員報酬期中改定", sec: "11-4",    tokens: 2148 },
  { code: "M", src: "MANUAL",  title: "e-Tax 電子提出 優先運用ガイド",  sec: "§ 6.1",   tokens:  608 },
  { code: "P", src: "POLICY",  title: "税務調査 初動対応プロトコル",    sec: "S-01",    tokens:  431 },
];
const KV_STEP = 0.95;  // seconds the spotlight stays on each row
const KV_CYCLE = KV_DOCS.length * KV_STEP;

function KnowledgeVault() {
  return (
    <div className="vault">
      <div className="vault-grid" aria-hidden="true" />

      {/* header strip */}
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

      {/* index — one document per row, spotlight cycles through */}
      <div
        className="vault-index"
        style={{ "--kv-cycle": `${KV_CYCLE}s`, "--kv-step": `${KV_STEP}s` }}
      >
        {KV_DOCS.map((d, i) => (
          <div
            className="krow"
            key={i}
            style={{ "--kv-delay": `${i * KV_STEP - KV_CYCLE}s` }}
          >
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
        ))}
      </div>

      {/* base bar */}
      <div className="vault-base">
        <div>
          <div className="nm">zeiro / knowledge base</div>
          <div className="sub">indexed · embedded · cited</div>
        </div>
        <div className="counter">10,847<span className="unit">vec</span></div>
      </div>
    </div>
  );
}

function KnowledgeSection() {
  const ref = useReveal();
  const sources = [
    { nm: "事務所マニュアル",      n: "1,284" },
    { nm: "FAQ 集 / Q&A",          n: "3,452" },
    { nm: "顧問先マスタ",          n: "  186" },
    { nm: "過去回答ログ",          n: "5,827" },
    { nm: "国税庁 通達・タックスアンサー", n: " 約12k" },
    { nm: "判例 / 質疑応答事例",   n: "  743" },
    { nm: "TKC・freee 仕訳データ", n: " 連動" },
    { nm: "所内Slack 既往スレッド", n: "  912" },
  ];
  return (
    <section className="section knowledge" id="knowledge">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">02</span>
            <span>事務所のすべてを、AIに渡す。</span>
          </div>
          <h2 className="section-title">
            "<em>事務所の頭の中</em>" を、<br />
            そのまま下書きの根拠に。
          </h2>
          <p className="section-lede">
            汎用 LLM は、貴所の<b>運用ルールも、顧問先の特記事項も知りません</b>。zeiro は事務所マニュアル、FAQ、
            過去回答、顧問先マスタ、国税庁通達まで取り込み、答えるたびに必ず<b>どこから来た答えか</b>を示します。
          </p>
        </div>

        <div className="kn-stage">
          <div className="kn-stat">
            <div className="lbl">事務所から学習したナレッジ</div>
            <div className="big">10,847<span className="plus">+</span><span className="unit">件</span></div>
            <p style={{ color: "var(--ink-2)", margin: 0, fontSize: 13.5, lineHeight: 1.65, maxWidth: "32em" }}>
              既存の事務所マニュアル PDF、Notion、Google Drive、Slack 既往スレッドから自動でインデックス。
              新しいルールを書き加えれば <b>15分以内</b> に下書きに反映されます。
            </p>

            <div className="kn-sources">
              {sources.map((s, i) => (
                <div key={i} className="kn-source-row">
                  <span className="dot" />
                  <span className="nm">{s.nm}</span>
                  <span className="n">{s.n}</span>
                </div>
              ))}
            </div>
          </div>

          <KnowledgeVault />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 3 — CITATIONS (interactive)
   ========================================================= */
const CITE_DATA = [
  {
    id: 1,
    title: "法人税申告書 提出期限の運用ルール",
    src: "事務所マニュアル",
    section: "§ 4.2",
    score: 0.94,
    snippet: "3月決算法人の場合、提出期限は決算日から2ヶ月以内（5月31日）。当該日が休日の場合は翌営業日まで延長される。地方法人税・住民税・事業税も同日が原則期限。",
  },
  {
    id: 2,
    title: "e-Tax 電子提出 優先運用ガイド",
    src: "事務所マニュアル",
    section: "§ 6.1",
    score: 0.88,
    snippet: "原則として全ての法人申告は e-Tax にて電子提出する。事前準備として、決算書（PL/BS/SS）、勘定科目内訳明細書、事業概況説明書の3点を顧問先より受領のこと。",
  },
  {
    id: 3,
    title: "山田商事 顧問契約 特記事項",
    src: "顧問先マスタ",
    section: "C-0142",
    score: 0.81,
    snippet: "貴社との顧問契約には「申告書ドラフトの事前確認」プロセスが含まれる。提出予定日の10日前（5月20日頃）に、確認用ドラフトを送付するルール。",
  },
];

function CitationsSection() {
  const ref = useReveal();
  const [active, setActive] = useState(1);
  return (
    <section className="section cites" id="citations">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">03</span>
            <span>引用なき下書きは、出さない。</span>
          </div>
          <h2 className="section-title">
            ハルシネーションを、<br />
            <em>構造的に</em>遮断する。
          </h2>
          <p className="section-lede">
            すべての文には、<b>事務所内の出典</b>がぶら下がっています。番号をクリックすると、根拠となったマニュアル §、FAQ Q-番号、過去回答の日付、
            類似度スコアまで遡れる。<b>「なぜそう答えたのか」</b>が、常に検証可能です。
          </p>
        </div>

        <div className="cite-stage">
          <div className="cite-paper">
            <div className="cite-paper-head">
              <span className="ctag">DRAFT</span>
              <span>To: 山田 正彦様 · 株式会社山田商事</span>
            </div>

            <p>
              <b>山田 正彦様</b>、いつもお世話になっております。
            </p>
            <p>
              ご照会いただきました法人税の申告・納付期限につきまして、<b>貴社は3月決算ですので、提出期限は 2026年5月31日（日）</b>、
              翌営業日 6月1日までとなります。
              <span
                className={`cite-mark ${active === 1 ? "active" : ""}`}
                onMouseEnter={() => setActive(1)}
                onClick={() => setActive(1)}
              >¹</span>
            </p>
            <p>
              e-Tax電子提出をご希望とのこと、承知いたしました。当事務所では原則すべての法人申告を e-Tax にて行っております。
              貴社からご準備いただく書類は <b>決算書 / 勘定科目内訳明細書 / 事業概況説明書</b> の3点です。
              <span
                className={`cite-mark ${active === 2 ? "active" : ""}`}
                onMouseEnter={() => setActive(2)}
                onClick={() => setActive(2)}
              >²</span>
            </p>
            <p>
              貴社の顧問契約には「申告書ドラフトの事前確認」プロセスが含まれておりますので、5月20日頃に弊所より確認用のドラフトをお送りいたします。
              <span
                className={`cite-mark ${active === 3 ? "active" : ""}`}
                onMouseEnter={() => setActive(3)}
                onClick={() => setActive(3)}
              >³</span>
            </p>
          </div>

          <div className="cite-cards">
            {CITE_DATA.map(c => (
              <div
                key={c.id}
                className={`cite-card ${active === c.id ? "active" : ""}`}
                onMouseEnter={() => setActive(c.id)}
                onClick={() => setActive(c.id)}
              >
                <div className="cite-card-head">
                  <span className="n">{c.id}</span>
                  <span className="title">{c.title}</span>
                  <span className="score">{c.score.toFixed(2)}</span>
                </div>
                <div className="meta">
                  <b>{c.src}</b>
                  <span className="sep">·</span>
                  <span>{c.section}</span>
                  <span className="sep">·</span>
                  <span>類似度 {Math.round(c.score * 100)}%</span>
                </div>
                <p className="snippet">{c.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 4 — CONFIDENCE & ESCALATION
   ========================================================= */
function ConfidenceDial({ value }) {
  // value 0..1
  const R = 90;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - value);
  return (
    <div className="conf-dial">
      <svg viewBox="0 0 200 200">
        <circle className="track" cx="100" cy="100" r={R} />
        <circle className="fill" cx="100" cy="100" r={R} strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <div className="center">
        <div className="v">{Math.round(value * 100)}<span className="unit">%</span></div>
        <div className="l">Confidence</div>
      </div>
    </div>
  );
}

function ConfidenceSection() {
  const ref = useReveal();
  const cases = [
    { v: 0.94, nm: "3月決算 申告期限の確認", desc: "FAQ Q-018 と事務所マニュアル §4.2 に完全一致。", grade: "0.94" },
    { v: 0.71, nm: "海外送金 源泉徴収判定", desc: "判定フローは存在するが、日米租税条約の適用可否は個別事情に依存。", grade: "0.71" },
    { v: 0.48, nm: "役員報酬 期中改定の損金算入", desc: "「業績悪化に伴う改定」該当性が個別判断。マニュアルが2024年4月で更新待ち。", grade: "0.48" },
  ];
  const [selected, setSelected] = useState(0);
  // auto-rotate
  useEffect(() => {
    const t = setInterval(() => setSelected(s => (s + 1) % cases.length), 4200);
    return () => clearInterval(t);
  }, []);
  const cur = cases[selected];
  return (
    <section className="section confidence" id="confidence">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">04</span>
            <span>迷ったら、所長へ。</span>
          </div>
          <h2 className="section-title">
            信頼度が閾値を割ったら、<br />
            <em>人間に</em>渡す。
          </h2>
          <p className="section-lede">
            類似ナレッジの一致度、過去類例の数、顧問契約の特記事項。これらを総合し <b>0–1 の信頼度</b> を算出。
            事務所が設定した閾値を下回ったとき、zeiro は<b>勝手に送信しない</b>。所長に確認を仰ぎます。
          </p>
        </div>

        <div className="conf-stage">
          <div className="conf-dial-wrap">
            <ConfidenceDial value={cur.v} />
            <div className="conf-dial-info">
              <div>
                <div className="nm">CASE · live</div>
                <div className="v">{cur.nm}</div>
              </div>
              <div className="s">{cur.desc}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {cases.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: i === selected ? "var(--bg-0)" : "transparent",
                      color: i === selected ? "var(--ink-0)" : "rgba(255,255,255,0.7)",
                      border: "1px solid " + (i === selected ? "var(--bg-0)" : "rgba(255,255,255,0.2)"),
                    }}
                  >
                    case {i + 1} · {c.grade}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="conf-threshold">
            <div className="conf-row auto">
              <div className="grade">≥ 0.85</div>
              <div className="label">
                自動送信 — 担当のみ通知
                <span className="sub">高確度 · 定型応答</span>
              </div>
              <div className="badge">auto</div>
            </div>
            <div className="conf-row review">
              <div className="grade">0.70 – 0.85</div>
              <div className="label">
                下書きを生成 · 担当者の承認後に送信
                <span className="sub">標準フロー</span>
              </div>
              <div className="badge">review</div>
            </div>
            <div className="conf-row escalate">
              <div className="grade">&lt; 0.70</div>
              <div className="label">
                所長へ即時エスカレーション
                <span className="sub">個別判断・新規論点</span>
              </div>
              <div className="badge">escalate</div>
            </div>
            <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <span>閾値は事務所ごとに調整可</span>
              <span>監査ログ完備</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 5 — MULTI-TURN MEMORY
   ========================================================= */
function MemorySection() {
  const ref = useReveal();
  return (
    <section className="section memory" id="memory">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">05</span>
            <span>会話の文脈を、覚えている。</span>
          </div>
          <h2 className="section-title">
            一往復で終わる質問は、<br />
            <em>そうそうない</em>。
          </h2>
          <p className="section-lede">
            「先週話していた e-Tax の件、もう一度送信先URLを教えて」— こうした<b>2往復目・3往復目の問い合わせ</b>でも、
            zeiro は前回までのやり取り、顧問契約、送付済み資料を踏まえた上で答えます。
          </p>
        </div>

        <div className="thread-stage">
          <div className="thread-rail">
            <div className="turn">
              <span className="mark">客</span>
              <div>
                <div className="head">
                  <span className="who">高橋 啓介</span>
                  <span className="role">CFO · 株式会社ジオメトリクス</span>
                  <span className="time">5/8 11:05</span>
                </div>
                <div className="body">{"年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。"}</div>
              </div>
            </div>

            <div className="turn agent">
              <span className="mark">所</span>
              <div>
                <div className="head">
                  <span className="who">佐藤 健一</span>
                  <span className="role">凜事務所 · AI下書きをそのまま送信</span>
                  <span className="time">5/8 11:18</span>
                </div>
                <div className="body">{"受付期限は申告書原本が 11月20日 必着、電子申告データは 11月25日 23:59 まで。期限3営業日前に自動リマインダーを送信します。詳細は FAQ Q-007 にも記載。"}</div>
              </div>
            </div>

            <div className="turn">
              <span className="mark">客</span>
              <div>
                <div className="head">
                  <span className="who">高橋 啓介</span>
                  <span className="role">CFO · 株式会社ジオメトリクス</span>
                  <span className="time">5/8 14:32</span>
                </div>
                <div className="body">{"ありがとうございます。電子申告データの送信先URLは昨年と同じでしょうか？念のため確認させてください。"}</div>
              </div>
            </div>

            <div className="turn draft">
              <span className="mark">AI</span>
              <div>
                <div className="head">
                  <span className="who">AI Agent</span>
                  <span className="role">下書き · v1 · 0.74秒で生成</span>
                  <span className="time">5/8 14:33</span>
                </div>
                <div className="body">{"ご確認ありがとうございます。送信先URLは "}<em>昨年から変更ございません</em>{"。念のため、ログイン情報を再共有いたします — URL: https://tax.rin-jimusho.jp/upload、初回ログイン時は事務所発行の認証コードが必要です（別途お送り済み）。"}</div>
              </div>
            </div>
          </div>

          <aside className="memory-tape">
            <h4>このスレッドで参照中の記憶</h4>
            <div className="memory-fact">
              <span className="gl" />
              <div>
                <b>送信先 URL は昨年から変更なし</b>
                <span className="src">kb-010 § 更新履歴</span>
              </div>
            </div>
            <div className="memory-fact">
              <span className="gl" />
              <div>
                <b>本顧問先は IPO 準備中、質問が継続発生</b>
                <span className="src">CL-008 · 顧問先マスタ note</span>
              </div>
            </div>
            <div className="memory-fact">
              <span className="gl" />
              <div>
                <b>3時間前に同スレッドで FAQ Q-007 を引用済み</b>
                <span className="src">同スレッド · 重複引用を抑制</span>
              </div>
            </div>
            <div className="memory-fact">
              <span className="gl" />
              <div>
                <b>認証コードは 4月12日に送付済み</b>
                <span className="src">送信履歴 · 別途送付済み</span>
              </div>
            </div>
            <div className="memory-fact">
              <span className="gl" />
              <div>
                <b>担当: 佐藤 健一 / 文体は丁寧体・段落短め</b>
                <span className="src">担当ごとの文体プロファイル</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 6 — NUMBERS
   ========================================================= */
function NumbersSection() {
  const ref = useReveal();
  return (
    <section className="section numbers" id="numbers">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">06</span>
            <span>実績で語る。</span>
          </div>
          <h2 className="section-title">
            <em>4ヶ月で</em> 事務所の生産性が<br />
            倍以上に。
          </h2>
          <p className="section-lede">
            関東 / 関西の 9つのパイロット事務所での導入結果。所員数 4–32名、顧問先数 60–410社のレンジ。
          </p>
        </div>

        <div className="numbers-grid">
          <div className="num-cell">
            <span className="lbl">— 自動回答率</span>
            <div className="v">73<span className="unit">%</span></div>
            <p className="note">問い合わせ全件のうち、<b>下書きを微修正なしで送信</b>できた割合。残りは担当者が編集または所長へ。</p>
          </div>
          <div className="num-cell">
            <span className="lbl">— 平均初回返答</span>
            <div className="v">22<span className="unit">min</span></div>
            <p className="note">受信から最初の返信送信までの中央値。導入前は <b>4時間18分</b>。</p>
          </div>
          <div className="num-cell">
            <span className="lbl">— 担当の処理量</span>
            <div className="v">3.4<span className="unit">×</span></div>
            <p className="note">担当者ひとりが1日に捌けた件数の伸び。所長は監督に集中、新規開拓・申告期対応に時間を回せる。</p>
          </div>
          <div className="num-cell">
            <span className="lbl">— 引用付き</span>
            <div className="v">100<span className="unit">%</span></div>
            <p className="note">送信された下書きのうち、<b>事務所内の出典が明示されている</b>割合。監査・教育・属人化解消に直結。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECTION 7 — CTA
   ========================================================= */
function CtaSection() {
  const ref = useReveal();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };
  return (
    <section className="cta" id="cta">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="cta-block">
            <div className="cta-inner">
              <div>
                <h2 className="cta-title">
                  <em>事務所のAI agent、</em><br />
                  はじめませんか。
                </h2>
                <p className="cta-sub">
                  まずは 30 分のデモから。事務所マニュアル PDF を 1 つお渡しいただければ、
                  その場で <b>貴所のナレッジで動く zeiro</b> を起動します。
                </p>
              </div>

              <form className="cta-form" onSubmit={submit}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(250,250,250,0.65)", letterSpacing: "0.10em", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
                  <span>デモ予約</span>
                  <span>所要 30分 · 無料</span>
                </div>
                <div className="input">
                  <input
                    type="email"
                    placeholder="office@example.co.jp"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="btn btn-solid">
                    {sent ? "送信しました ✓" : "リクエスト"}
                  </button>
                </div>
                <div className="cta-bullets">
                  <span className="b">秘密保持契約 同時締結</span>
                  <span className="b">事務所ごと専用環境</span>
                  <span className="b">国内データセンター</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="foot">
      <div className="container foot-inner">
        <div className="brand-line">
          <span className="brand-mark" style={{ width: 22, height: 22, background: "var(--ink-0)", color: "var(--bg-0)", borderRadius: 5, display: "inline-grid", placeItems: "center", fontWeight: 600, fontSize: 12, fontFamily: "var(--font-sans)", letterSpacing: "-0.02em" }}>z</span>
          zeiro
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 400 }}>tax-office agent</span>
        </div>
        <div className="meta">
          © 2026 zeiro · 東京都千代田区
          <span style={{ margin: "0 12px", color: "var(--ink-4)" }}>·</span>
          info@zeiro.jp
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   APP
   ========================================================= */
function LandingApp() {
  return (
    <div className="page">
      <div className="bg-grid" />
      <TopBar />
      <Hero />
      <Marquee />
      <ChannelsSection />
      <KnowledgeSection />
      <CitationsSection />
      <ConfidenceSection />
      <MemorySection />
      <NumbersSection />
      <CtaSection />
      <Foot />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LandingApp />);
