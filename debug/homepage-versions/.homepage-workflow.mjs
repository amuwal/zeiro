export const meta = {
  name: 'zeiro-homepage-versions',
  description:
    'Design-agency-grade homepage versions for Zeiro (direction → curate → build → critique → refine → gallery)',
  phases: [
    { title: 'Direction', detail: '6 creative directors propose distinct art directions' },
    { title: 'Curate', detail: 'curator picks + sharpens the 3 strongest, most distinct' },
    {
      title: 'Build',
      detail: 'one senior design-engineer crafts each version (self-contained HTML)',
    },
    {
      title: 'Critique',
      detail: 'ruthless design-director scores each against anti-slop + craft rubric',
    },
    { title: 'Refine', detail: 'apply every fix; final pixel pass' },
    { title: 'Assemble', detail: 'gallery index + README tying the versions together' },
  ],
};

// ───────────────────────────── shared context ─────────────────────────────

const OUT_DIR = '/Users/amuwal_1/pc/zeiro/debug/homepage-versions';

const BRAND = `
# Zeiro — what we are
Zeiro is a customer-response AI agent for Japanese tax-accounting firms (税理士事務所).
Inbound client questions arrive by email. Zeiro: receives → classifies (triage) →
drafts a first reply grounded in the FIRM'S OWN knowledge base (RAG, with citations) →
the 税理士 reviews → sends. The tax accountant only spends time on what truly needs judgement.

Audience: principals (所長税理士) and office managers (事務長) of firms with 50–300 client
companies. This is a REGULATED profession — 守秘義務 (statutory confidentiality, 税理士法 第38条)
is non-negotiable. So the tone is: calm, precise, trustworthy, premium, warm — NOT a playful
consumer startup. Think the restraint of Linear / Stripe / Vercel, crossed with the warmth of
fine Japanese editorial print and the cream-paper material identity below. Quiet confidence.
Primary language is Japanese; English may appear as a secondary/typographic layer.
`.trim();

const COPY = `
# Copy bank — use REAL, specific copy. NO lorem, NO vague "seamlessly/effortlessly" filler.
Brand: Zeiro  (wordmark capitalised)
Tagline (JP): 税理士事務所のための、顧客対応AIエージェント
Possible headlines (pick/adapt one per version — make it land):
  • 顧問先対応の時間を、税理士の判断に戻す。
  • 問い合わせはAIが下書きする。判断は、税理士がする。
  • 定型的な顧問先対応を、2〜3分のレビューに。
Sub-headline:
  受信 → 分類 → 事務所ナレッジで下書き → 税理士レビュー → 送信。
  本当に判断が必要な案件にだけ、集中できる。

The flow (5 steps) — 受信 → 分類（トリアージ）→ ナレッジ検索（RAG）→ 下書き生成 → レビュー＆送信

The 5 categories: 期日確認 ・ 書類提出 ・ 税務質問 ・ 顧問契約 ・ その他

Proof / KPIs (keep these numbers consistent — they tie to the motion videos):
  • 一次対応 15〜30分 → 2〜3分（レビューのみ）
  • 税理士のレビュー必要案件 100% → 約32%（業界HITL平均）
  • 平均応答 14.2分 → 24秒（−97%）
  • 月 1,247 件の返信を下書き
  • 年間 738 時間を取り戻す
  • 営業時間外の問い合わせも、即時に下書き
  • 月間 約200時間 削減（顧問100社 × 月10件 想定）

Feature pillars (real substance):
  • 事務所ナレッジでRAG — 過去の回答・所内FAQ・業務マニュアル・規程を情報源に。下書きには必ず「引用元」を明示。
  • エスカレーション判定 — 税務判断を要する質問・信頼度<0.75・「至急 / クレーム / 税務調査」は税理士レビューを必須化。目標エスカレーション率 約32%。
  • ハルシネーション防止 — 法令・税率などの数値は、ナレッジに無い限り生成しない。
  • 監査ログ — 誰が・いつ・どのモデルで・どの引用に基づいて送ったかを全件記録。
  • 守秘義務（税理士法 第38条） — My Number は受信時にマスク。jp-tokyo データレジデンシー。学習しない契約のLLMのみ利用。

CTAs: 「デモを見る」 ・ 「資料を請求する」 ・ 「無料で試す」  (EN secondary: Book a demo)
Footer trust line: 税理士法 第38条 守秘義務準拠 ・ データ保管 jp-tokyo ・ 学習しないLLM契約
`.trim();

const TOKENS = `
# Brand tokens — USE THESE EXACTLY. Never invent off-brand colours (no purple gradients, no blue SaaS).
Fonts (load via Google Fonts):
  @import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap");
  --font-sans: "Inter Tight","Noto Sans JP",system-ui,sans-serif;  (latin / display)
  --font-jp:   "Noto Sans JP","Inter Tight",system-ui,sans-serif;  (japanese body)
  --font-mono: "JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;  (data / labels)
  JP type quality is mandatory: font-feature-settings:"palt","ss01"; tight, intentional line-breaks (<br> or word-break), no orphaned punctuation.

Palette (oklch() works in modern Chrome — you may use these directly; sRGB hex given as fallback):
  bg #f2eee6   bg-2 #ede8de   surface #fbf9f4   surface-2 #f7f4ed   paper #ffffff
  ink #14110d  ink-2 #3a352d  ink-soft #5a5248  muted #7a7268  muted-2 #9a9286
  line #e2dccf  line-strong #cfc8b8
  accent oklch(38% 0.045 150) = #314936   accent-ink #15301b   accent-soft #d9eadc
  accent-bright #3b834e   accent-glow #5cb572   positive #236436   urgent #c13234
  category: 期日 #a06f30 ・ 書類 #2f6868 ・ 税務 #9a504b ・ 顧問契約 #594c7d
Radius: 6 / 10 / 14px.  Easing: cubic-bezier(0.22,1,0.36,1) (out), cubic-bezier(0.65,0,0.35,1) (in-out).
Shadows are SOFT and warm: 0 1px 2px rgba(20,17,13,.04), 0 8px 24px -16px rgba(20,17,13,.12).
The world is warm cream paper with deep ink type and a muted forest-green accent. A premium "ink"
(near-black/dark) section is allowed for contrast, but the brand's home is the cream paper.
`.trim();

const ASSETS = `
# The "alive" layer MUST be LIVE and INTERACTIVE — authored in-browser, reactive to cursor / scroll / time.
# DO NOT make a looping background video the centrepiece. (Pre-rendered Remotion MP4s of these concepts
# exist at ../assets/video/*.mp4, but the founder finds them UNDERWHELMING — a baked loop reads as filler.)
# Instead, BUILD THE LIVE EQUIVALENT in Three.js / WebGL2 / canvas / animated SVG so it responds to the user.
# The PNG stills below are CONCEPT REFERENCE for the *idea* (and acceptable ONLY as a prefers-reduced-motion /
# poster fallback) — never the hero itself. Re-create these as live, generative, hand-built scenes:
  IsoWorkflow        ref still IsoWorkflow_f240.png        — isometric: messy in-tray → glowing Zeiro engine → sorted output + finished draft.  Build live: R3F/three.js isometric scene, parallax to cursor.
  DocumentVortex     ref still DocumentVortex_f200.png     — unread docs swirl in a 3D vortex, then collapse into one sorted, category-tabbed stack.  Build live: GPU/instanced particle system.
  JapanGlobe         ref still JapanGlobe_f240.png         — wireframe globe, firm-nodes across Japan, light-arcs converging on a Zeiro core.  Build live: three.js globe, drag-to-rotate.
  KpiMonolith        ref still KpiMonolith_f205.png        — "hours saved" tower-city (738h/yr), slow orbit.  Build live: instanced 3D bars, scroll-driven camera.
  VaultSeal          ref still VaultSeal_f210.png          — 守秘義務 §38: PII → sealing vault, My-Number masked, audit checklist locks.  Build live: interactive seal/redact reveal.
  AgentPipeline3D    ref still AgentPipeline3D_f235.png    — 5-step pipeline (受信→分類→検索→下書き→レビュー) as a receding 3D diagonal with a travelling pulse.  Build live: CSS-3D / R3F + scroll scrub.
  TimeReclaimed      ref still TimeReclaimed_f200.png      — editorial data dashboard (1,247/mo, 14.2分→24秒 −97%, sparkline, KPI tiles).  Build live: animated SVG/canvas charts that count up on scroll.
  KnowledgeConstellation ref KnowledgeConstellation.png   — RAG citations as a constellation around a streaming draft.  Build live: canvas/WebGL constellation + token-stream typing.
  DocumentCoverflow  ref still DocumentCoverflow_f205.png  — coverflow of inbox mail; centre card flips email → cited draft.  Build live: CSS-3D coverflow, drag/scroll.
  DraftStream        ref still DraftStream.png             — AI streams a cited reply token-by-token beside the source email.  Build live: real typing + citation chips.
More concept refs in assets/still/: Hero_act1..6, InboxCascade/Particles/Pipeline, DeadlineCalendar,
  Logo{Minimal,Bilingual,Geometric}, Kpi{Counter,Clock,Compare}, Draft{Split,Thinking}, Trust{Redact,Vault,Shield}.
`.trim();

const TECH = `
# Technical contract (the pages will be SERVED over local http, root = ${OUT_DIR}).
- Deliverable: ONE self-contained file  ${OUT_DIR}/<slug>/index.html  (inline <style> + <script>). No build step.
- This is a DESIGN PROTOTYPE, not app source — the repo's 200-line cap does NOT apply. Favour craft over brevity (a complete page is typically 450–900 intentional lines).
- Tools you SHOULD use (these are what real studios ship):
    • GSAP + ScrollTrigger via CDN (cdnjs UMD globals) for scroll choreography / scrubbed timelines.
    • Lenis via CDN for buttery smooth scroll (https://unpkg.com/lenis/dist/lenis.min.js, global \`Lenis\`).
    • three.js (live, in-browser) via an ESM import map — e.g. <script type="importmap">{"imports":{"three":"https://esm.sh/three@0.171.0","three/addons/":"https://esm.sh/three@0.171.0/examples/jsm/"}}</script> then <script type="module">. Served over http so import maps work. Use it for real, mouse/scroll-reactive 3D (isometric scene, particle vortex, globe, instanced data-city). OrbitControls/postprocessing from three/addons are available.
    • Raw WebGL2 + hand-written GLSL for bespoke ambient shaders (warm paper grain, flowing gradient, ink diffusion, caustics) — reacting to mouse + time.
    • The "alive" centrepiece must be LIVE and reactive (3D scene / shader / generative canvas / scroll-scrubbed SVG). A pre-rendered MP4 is NOT acceptable as the hero — at most a prefers-reduced-motion poster fallback.
- MANDATORY quality bar:
    • Real responsive layout (fluid clamp() type scale; works 360px → 1920px). A working mobile nav.
    • prefers-reduced-motion: kill autoplay/animation, show poster stills, instant reveals.
    • Performance: videos preload="metadata" + lazy (IntersectionObserver play/pause); never autoplay offscreen video.
    • Accessible: semantic landmarks, alt text, visible focus rings, AA contrast, aria on interactive bits.
    • A custom-tuned cursor / magnetic CTA / hairline-grid system are welcome but only if they serve the concept — no decoration for its own sake.
- Use the brand fonts + tokens above. Set font-feature-settings for JP. No off-brand colours.
`.trim();

const ANTISLOP = `
# The bar: "as if a great design agency made it" + "feels alive, not AI-slop", "every pixel intentional".
KILL these AI-slop tells on sight:
  ✗ generic centered hero with a purple/blue gradient and a glowing blob
  ✗ a row of 3 identical icon+title+blurb cards, evenly spaced, emoji bullets
  ✗ vague copy ("Seamlessly streamline your workflow", "Empower your team", "The future of…")
  ✗ default system font, no type scale, no tracking decisions, no baseline rhythm
  ✗ glassmorphism-by-default, meaningless floating shapes, fake logo bars, stock gradients
  ✗ everything the same weight/size; no hierarchy, no tension, no asymmetry, no editorial point of view
  ✗ a looping background MP4 standing in for interactivity — the founder finds the baked videos underwhelming; build the LIVE scene
REQUIRE craft instead:
  ✓ a clear art-directed point of view; one memorable signature moment
  ✓ a real typographic system — considered scale, tracking, JP/EN pairing, baseline/grid rhythm, intentional line breaks
  ✓ specific, true copy and numbers (from the copy bank) — the page could only be Zeiro's
  ✓ purposeful motion tied to content/scroll; restraint; nothing bounces for no reason
  ✓ tasteful use of the cream-paper palette + the hand-crafted brand videos in the RIGHT slots
  ✓ deliberate whitespace, alignment, optical adjustments — pixel-level care
`.trim();

const CONTEXT = [BRAND, COPY, TOKENS, ASSETS, TECH, ANTISLOP].join('\n\n');

// ───────────────────────────── schemas ─────────────────────────────

const DIRECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'archetype',
    'bigIdea',
    'moodWords',
    'artDirection',
    'typeSystem',
    'colorTreatment',
    'motionLanguage',
    'signatureMoment',
    'sectionFlow',
    'heroAsset',
    'antiSlopNotes',
  ],
  properties: {
    name: { type: 'string' },
    archetype: { type: 'string' },
    bigIdea: { type: 'string', description: 'one sentence concept that could only be Zeiro' },
    moodWords: { type: 'array', items: { type: 'string' } },
    artDirection: { type: 'string' },
    typeSystem: { type: 'string' },
    colorTreatment: { type: 'string' },
    motionLanguage: { type: 'string' },
    signatureMoment: { type: 'string', description: 'the one interaction people remember' },
    sectionFlow: { type: 'array', items: { type: 'string' } },
    heroAsset: { type: 'string' },
    supportingAssets: { type: 'array', items: { type: 'string' } },
    antiSlopNotes: { type: 'string' },
  },
};

const CURATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rationale', 'versions'],
  properties: {
    rationale: {
      type: 'string',
      description: 'why these 3 + why they are maximally distinct from each other',
    },
    versions: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'slug',
          'title',
          'tagline',
          'archetype',
          'brief',
          'sectionPlan',
          'assetMap',
          'typeScale',
          'paletteUse',
          'motionPlan',
          'signatureMoment',
        ],
        properties: {
          slug: { type: 'string', description: 'kebab-case folder name, e.g. v1-editorial-ledger' },
          title: { type: 'string' },
          tagline: { type: 'string' },
          archetype: { type: 'string' },
          brief: {
            type: 'string',
            description: 'the full build brief — a paragraph the engineer builds straight from',
          },
          sectionPlan: {
            type: 'array',
            description:
              'ordered sections; each item one line: "id — purpose — real content/copy — live asset/scene — motion"',
            items: { type: 'string' },
          },
          assetMap: { type: 'array', items: { type: 'string' } },
          typeScale: { type: 'string' },
          paletteUse: { type: 'string' },
          motionPlan: { type: 'string' },
          signatureMoment: { type: 'string' },
        },
      },
    },
  },
};

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slug',
    'path',
    'summary',
    'librariesUsed',
    'assetsUsed',
    'sections',
    'lineCount',
    'selfReviewNotes',
  ],
  properties: {
    slug: { type: 'string' },
    path: { type: 'string' },
    summary: { type: 'string' },
    librariesUsed: { type: 'array', items: { type: 'string' } },
    assetsUsed: { type: 'array', items: { type: 'string' } },
    sections: { type: 'array', items: { type: 'string' } },
    lineCount: { type: 'number' },
    selfReviewNotes: { type: 'string' },
  },
};

const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'craftScore', 'slopScore', 'verdict', 'strengths', 'issues'],
  properties: {
    slug: { type: 'string' },
    craftScore: { type: 'number', description: '0-100, agency-grade craft' },
    slopScore: {
      type: 'number',
      description: '0-100, how much it still reads as AI-slop (lower is better)',
    },
    verdict: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'area', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          area: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
};

const REFINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'path', 'changesApplied', 'finalSummary', 'craftConfidence'],
  properties: {
    slug: { type: 'string' },
    path: { type: 'string' },
    changesApplied: { type: 'array', items: { type: 'string' } },
    finalSummary: { type: 'string' },
    craftConfidence: { type: 'number' },
  },
};

// ───────────────────────────── archetypes ─────────────────────────────

const ARCHETYPES = [
  {
    key: 'editorial-swiss-jp',
    seed: `EDITORIAL / SWISS–JAPANESE PRINT. A typographic newspaper-of-record feel: a strict modular grid, hairline rules, baseline rhythm, big restrained display type, asymmetric columns, generous margins, JP set with real care (palt, tate-gumi accents allowed). Almost no "UI" chrome. Motion = precise, mechanical reveals and a scrubbed video "plate". Trust through editorial authority. Think: a financial broadsheet that happens to be alive.`,
  },
  {
    key: 'ink-cinematic',
    seed: `CINEMATIC INK. Open on a deep-ink (near-black, warm) full-bleed hero with a LIVE, mouse-reactive centrepiece — a hand-written WebGL2 shader (ink diffusion / warm grain / flowing field) or a live three.js scene — then RESOLVE downward into the cream-paper world for the body. Dramatic but disciplined; one bold contrast move, then calm. The dark stage makes the green accent and the live light sing.`,
  },
  {
    key: 'tactile-paper',
    seed: `TACTILE PAPER / MATERIAL WARMTH. Lean all the way into the cream-paper identity: layered paper planes, soft warm shadows, letterpress-feeling type, the brand videos framed like printed inserts / tipped-in plates, subtle parallax as if pages lift. Human, warm, trustworthy, analog. The anti-thesis of cold SaaS.`,
  },
  {
    key: 'product-truth',
    seed: `PRODUCT-FORWARD / SHOW THE WORK. Calm, confident, Linear/Stripe-grade restraint where the REAL inbox→draft→send flow is the hero — built LIVE: a working mini inbox UI, a draft that streams in token-by-token with citation chips, a scroll-scrubbed live 3D/CSS-3D pipeline (受信→分類→検索→下書き→レビュー). Data-honest, KPI counters that animate on scroll. Sells by showing exactly what happens, interactively, beautifully.`,
  },
  {
    key: 'kinetic-webgl',
    seed: `KINETIC WEBGL ATMOSPHERE. A living, hand-written shader field (flowing paper-grain gradient or a slow KnowledgeConstellation-style particle/RAG field, reacting to the cursor) as an ambient, restrained backdrop; content floats in calm typographic layers; a live three.js focal scene anchors the work. Alive everywhere, but quiet — never busy.`,
  },
  {
    key: 'ma-minimal',
    seed: `MA (間) — NEGATIVE-SPACE MINIMALISM. Japanese spatial restraint: enormous whitespace, ONE idea per viewport, slow scroll pacing, a single hairline and a single moving element per scene. A lone live element (a quiet shader, one drifting 3D object, kinetic type) appears sparingly, framed by huge margins. Quiet luxury; the confidence to leave space. Every element earns its place.`,
  },
];

// ───────────────────────────── phase 1: direction ─────────────────────────────

phase('Direction');
const directions = (
  await parallel(
    ARCHETYPES.map(
      (a, i) => () =>
        agent(
          `You are a world-class creative director pitching ONE art direction for the Zeiro marketing homepage.\n` +
            `Your assigned archetype to push HARD and make specific (do not blend it away):\n${a.seed}\n\n` +
            `Full brand + copy + asset + token + tech + anti-slop context:\n\n${CONTEXT}\n\n` +
            `Return a single, opinionated, buildable art direction. Be concrete: name signature type sizes/treatments, ` +
            `exactly which brand video(s) go where, the one signature moment, and the ordered section flow. ` +
            `Ground every section in the real copy/KPIs. Explicitly note why this direction CANNOT read as AI-slop.`,
          { label: `direction:${a.key}`, phase: 'Direction', schema: DIRECTION_SCHEMA },
        ),
    ),
  )
).filter(Boolean);

log(`${directions.length} art directions proposed`);

// ───────────────────────────── phase 2: curate ─────────────────────────────

phase('Curate');
const curation = await agent(
  `You are the executive design director. Below are ${directions.length} proposed art directions for the Zeiro homepage.\n\n` +
    `${JSON.stringify(directions, null, 2)}\n\n` +
    `Full brand context for grounding:\n\n${CONTEXT}\n\n` +
    `Pick the 3 STRONGEST directions that are ALSO maximally distinct from each other (do not pick three minimalisms; ` +
    `cover clearly different moods — e.g. one editorial/quiet, one warm/tactile or cinematic, one product/kinetic). ` +
    `Then SHARPEN each into a precise, build-ready brief an engineer can implement straight from: give a kebab slug ` +
    `(prefix v1-/v2-/v3-), a title + tagline, the full brief, an ordered sectionPlan (each section: id, purpose, real ` +
    `content drawn from the copy bank, which brand asset/video, and its motion), the assetMap, a concrete type scale, ` +
    `how the palette is used, the motion plan, and the signature moment. Keep all KPIs/numbers consistent with the copy bank.`,
  { label: 'curate:select-3', phase: 'Curate', schema: CURATION_SCHEMA },
);

const versions = curation.versions;
log(`curated 3 versions: ${versions.map((v) => v.slug).join(', ')}`);

// ───────────────── phases 3-5: build → critique → refine (pipeline) ─────────────────

const built = await pipeline(
  versions,

  // build
  (v) =>
    agent(
      `You are a senior design engineer at a top studio. Build the Zeiro homepage version "${v.title}" (${v.archetype}) ` +
        `as a single self-contained file at ${OUT_DIR}/${v.slug}/index.html (create the folder; use the Write tool).\n\n` +
        `THE BRIEF YOU MUST IMPLEMENT:\n${JSON.stringify(v, null, 2)}\n\n` +
        `Full brand + copy + asset + token + tech + anti-slop context:\n\n${CONTEXT}\n\n` +
        `Build the complete page end-to-end (nav, hero, the problem/why, the 5-step flow, feature pillars, proof/KPIs, ` +
        `trust & 守秘義務 compliance, CTA, footer) — every section from the sectionPlan, with REAL copy.\n\n` +
        `THE ALIVE LAYER IS LIVE, NOT A VIDEO: build the signature scene in-browser and make it react to cursor/scroll/time — ` +
        `live three.js (ESM import map) for real 3D, hand-written WebGL2/GLSL for ambient shaders, or generative canvas/animated SVG. ` +
        `The founder finds the pre-baked MP4s underwhelming, so DO NOT drop a looping <video> in as the hero. Use the ../assets/still/<File>.png ` +
        `images ONLY as concept reference and as a prefers-reduced-motion / poster fallback. Use GSAP+ScrollTrigger and Lenis from CDN. ` +
        `Fully responsive (360→1920) with a working mobile nav. Respect prefers-reduced-motion (pause heavy loops, show a static composition). ` +
        `Keep it performant: pause offscreen rAF loops via IntersectionObserver; cap devicePixelRatio for WebGL.\n\n` +
        `Before you finish: re-read your own file against the anti-slop rubric and fix anything generic. ` +
        `Then verify the file exists and report the real line count via Bash (wc -l).`,
      { label: `build:${v.slug}`, phase: 'Build', schema: BUILD_SCHEMA },
    ),

  // critique
  (build, v) =>
    agent(
      `You are a ruthless, senior design director doing a craft review. Read the built homepage at ` +
        `${OUT_DIR}/${v.slug}/index.html (use the Read tool — read ALL of it).\n\n` +
        `Intended brief:\n${JSON.stringify(v, null, 2)}\n\n` +
        `Score it on craft (0-100, agency-grade) and slop (0-100, how much it STILL reads as AI-generated; lower is better). ` +
        `Then list every concrete, actionable fix — pixel-level: type scale/tracking/leading, spacing & alignment, grid, ` +
        `colour use vs tokens, hierarchy, JP typography (palt, line breaks, orphans), the video framing/posters/reduced-motion, ` +
        `responsive breakpoints, accessibility (focus, contrast, alt, aria), performance, and ANY surviving AI-slop tell. ` +
        `Each issue: severity (critical/major/minor), area, the problem, and a specific fix the engineer can apply directly. ` +
        `Be exacting — assume this ships to a paying tax firm.\n\nAnti-slop + craft rubric:\n${ANTISLOP}\n\nTokens:\n${TOKENS}`,
      { label: `critique:${v.slug}`, phase: 'Critique', schema: CRITIQUE_SCHEMA },
    ),

  // refine
  (crit, v) =>
    agent(
      `You are the senior design engineer doing the final pixel pass on ${OUT_DIR}/${v.slug}/index.html. ` +
        `Read the file, then APPLY every fix from this craft review (use Edit/Write):\n\n${JSON.stringify(crit, null, 2)}\n\n` +
        `Resolve every critical and major issue, and as many minors as you can without harming the concept. ` +
        `Do a final whole-page craft pass yourself too: optical alignment, consistent spacing rhythm, tracking on display ` +
        `type, JP line-breaks/orphans, hover/focus states, reduced-motion correctness, and mobile layout. Do NOT regress the ` +
        `concept or remove the brand videos. Keep it a single self-contained file.\n\n` +
        `Brief (for grounding):\n${JSON.stringify(v, null, 2)}\n\nContext:\n${CONTEXT}\n\n` +
        `Report exactly what you changed and your confidence the page is now agency-grade (0-100).`,
      { label: `refine:${v.slug}`, phase: 'Refine', schema: REFINE_SCHEMA },
    ),
);

const finals = built.filter(Boolean);
log(`${finals.length}/3 versions built, critiqued, refined`);

// ───────────────────────────── phase 6: assemble ─────────────────────────────

phase('Assemble');
const gallery = await agent(
  `You are building a polished gallery/index that ties together the ${finals.length} Zeiro homepage versions, plus a README.\n\n` +
    `The versions (folder = slug, each has index.html):\n${JSON.stringify(versions, null, 2)}\n\n` +
    `Refine results:\n${JSON.stringify(finals, null, 2)}\n\n` +
    `Brand tokens + context for styling the gallery on-brand:\n${TOKENS}\n\n${BRAND}\n\n` +
    `1) Write ${OUT_DIR}/index.html — an on-brand (cream paper, Inter Tight + Noto Sans JP, brand tokens) landing/gallery ` +
    `that presents each version as a generous card (title, tagline, archetype, a short "why it's different" line) linking ` +
    `to ./<slug>/index.html, opening in a new tab. Make the gallery itself feel crafted, not a bare list. Responsive.\n` +
    `2) Write ${OUT_DIR}/README.md — what this folder is, how to view it (served over local http at the project's design ` +
    `static server), the 3 directions and their concepts, the shared assets/ folder, and how to port a chosen version into ` +
    `apps/web. \nReturn the two paths and a one-paragraph summary.`,
  {
    label: 'assemble:gallery',
    phase: 'Assemble',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['indexPath', 'readmePath', 'summary'],
      properties: {
        indexPath: { type: 'string' },
        readmePath: { type: 'string' },
        summary: { type: 'string' },
      },
    },
  },
);

return {
  versions: versions.map((v) => ({ slug: v.slug, title: v.title, tagline: v.tagline, archetype: v.archetype })),
  curationRationale: curation.rationale,
  refined: finals,
  gallery,
}
