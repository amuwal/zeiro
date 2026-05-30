# Zeiro — landing-page motion set

A Remotion project for the Zeiro landing page. Two layers:

1. The original **type / 2D set** — 10 animation concepts across 19 compositions plus a long-form **hero piece**.
2. A newer **flagship 3D & infographic set** — 8 bigger, more ambitious pieces: real WebGL 3D (via `@remotion/three` + React Three Fiber), CSS-3D depth, and a dense data-viz dashboard.

Every composition uses the brand tokens from `apps/web/styles/tokens.css` (cream
paper, deep ink, muted accent green, category colours) and the same Inter Tight +
Noto Sans JP + JetBrains Mono stack the product UI uses, so motion lives in the
same world as the rest of the brand.

## Flagship 3D & infographic set (new)

These are the "stop-scrolling" pieces — isometric 3D, a 3D globe, a 3D data city,
and a data dashboard. Five are true WebGL 3D; three are CSS-3D / 2.5D.

| Composition | Kind | What it sells |
|---|---|---|
| `IsoWorkflow` ⭐ | Isometric 3D (R3F) | The marquee. Messy in-tray → glowing Zeiro engine → tidy sorted output + finished draft, on a cream stage |
| `DocumentVortex` | 3D particle (R3F) | 142 unread documents swirl in a vortex and collapse into one sorted, category-tabbed stack |
| `JapanGlobe` | 3D globe (R3F) | A rotating wireframe globe with firm-nodes across Japan and light-arcs converging on a central Zeiro core — "nationwide" |
| `KpiMonolith` | 3D data city (R3F) | 26 weekly "hours saved" towers rising on a dark floor under a slow camera orbit — 738h/yr reclaimed |
| `VaultSeal` | 3D vault (R3F) | 守秘義務 / 税理士法 §38 — PII flies into a sealing vault, My-Number masked, audit checklist locks |
| `AgentPipeline3D` | CSS-3D depth flow | The 5-step agent pipeline (受信→分類→検索→下書き→レビュー) as a receding diagonal of cards with a travelling pulse |
| `TimeReclaimed` | 2.5D infographic | A trustworthy editorial dashboard: 1,247 replies/mo donut, 14.2分→24秒 (−97%), unread sparkline, KPI tiles |
| `DocumentCoverflow` | CSS-3D flip | A coverflow of inbox mail; the centre card flips from a received email to a cited Zeiro draft |

3D stack: `three` + `@react-three/fiber@9` (React-19 compatible) + `@remotion/three` (`ThreeCanvas`) + `@react-three/drei`.
Brand-true sRGB hex equivalents of the OKLCH tokens live in `src/three/palette3d.ts`; the shared studio
lighting + shadow rig is `src/three/rig.tsx`.

> **Rendering 3D:** the default Chromium GL backend fails to create a WebGL context
> in this headless environment — **render with `--gl=angle`** (the helper scripts already do).

## Run

```bash
cd debug/zeiro-animations
npm install          # already done if the stills/ folder is populated
npm run dev          # launches Remotion Studio at http://localhost:3000
```

To render any one composition (add `--gl=angle` for the 3D pieces):

```bash
npx remotion render <CompositionId> out.mp4 --scale=0.5 --gl=angle
npx remotion still  <CompositionId> out.png --frame=<n> --gl=angle
```

Faster batch helpers (bundle once, render many — bundling dominates, so this beats
calling the CLI per composition). They always use the ANGLE GL backend:

```bash
# stills -> stills3d/<Id>_f<frame>.png
node scripts/shoot.mjs scale=0.5 IsoWorkflow:240 JapanGlobe:200 KpiMonolith:205

# MP4s -> videos/<Id>.mp4
node scripts/shootvideo.mjs scale=0.5 conc=3 IsoWorkflow DocumentVortex JapanGlobe
```

## The 10 animations

| # | Story | Composition IDs | What it sells |
|---|---|---|---|
| **0** | Hero arc — 28 s | `HeroCinematic` | Six-act flagship: chaos → wordmark → work → draft → numbers → mark |
| 1 | Wordmark reveal | `LogoMinimal`, `LogoBilingual`, `LogoGeometric` | Brand presence — three personalities of the same mark |
| 2 | Inbox → order | `InboxCascade`, `InboxParticles`, `InboxPipeline` | "Chaos becomes calm" — three metaphors |
| 3 | AI drafts a reply | `DraftSplit`, `DraftStream`, `DraftThinking` | Shows the *substance* of what Zeiro does |
| 4 | Trust & compliance | `TrustRedact`, `TrustVault`, `TrustShield` | 守秘義務, PII masking, audit posture |
| 5 | Time reclaimed | `KpiCounter`, `KpiClock`, `KpiCompare` | The economic proof — three angles |
| 6 | Grounded retrieval | `KnowledgeConstellation` | RAG citations as a constellation around the draft |
| 7 | Nationwide footprint | `JapanMap` | "For every firm in this country" — Sapporo → Naha archipelago |
| 8 | Deadline recovery | `DeadlineCalendar` | Red → green wave across a month grid |

The three styles per concept (minimal / bilingual / geometric, cascade / particles /
pipeline, etc.) are deliberately distinct so you can pick the one that fits the
page slot you have — pure type, dense data, or narrative scene.

## Stills

A representative still for every composition is in `stills/`. Pick a frame, run
`npx remotion still <id> <out>.png --frame=<n>` to re-shoot any of them.

## Videos

H.264 MP4s live in `videos/`. **All 8 flagship 3D / infographic pieces are rendered:**
`IsoWorkflow`, `DocumentVortex`, `JapanGlobe`, `KpiMonolith`, `VaultSeal`,
`AgentPipeline3D`, `TimeReclaimed`, `DocumentCoverflow` (≈8–10 s each, scale 0.5).

Plus showcase pieces from the original set: `HeroCinematic` (28 s hero),
`DraftStream`, `KpiCompare`, `JapanMap`.

Re-render any with `node scripts/shootvideo.mjs scale=0.5 conc=3 <Id> ...`
(or `npx remotion render <id> videos/<id>.mp4 --scale=0.5 --gl=angle`).

## File layout

```
src/
  Root.tsx                         # composition registry
  theme.ts                         # tokens lifted from apps/web/styles/tokens.css
  fonts.ts                         # Inter Tight / Noto Sans JP / JetBrains Mono
  common/
    Background.tsx                 # paper-grain bg, "cream" / "ink" / "surface"
    EmailCard.tsx                  # shared inbox card
    sampleEmails.ts                # JP fixture data — emails, draft, citations
  compositions/
    LogoMinimal.tsx
    LogoBilingual.tsx
    LogoGeometric.tsx
    InboxCascade.tsx
    InboxParticles.tsx
    InboxPipeline.tsx
    DraftSplit.tsx
    DraftStream.tsx
    DraftThinking.tsx
    TrustRedact.tsx
    TrustVault.tsx
    TrustShield.tsx
    KpiCounter.tsx
    KpiClock.tsx
    KpiCompare.tsx
    KnowledgeConstellation.tsx
    JapanMap.tsx
    DeadlineCalendar.tsx
    HeroCinematic.tsx
    hero/
      act1Chaos.tsx                # "未読 142 件"
      act2Cut.tsx                  # Zeiro intercepts
      act3Work.tsx                 # classify / retrieve / draft
      act4Draft.tsx                # typewriter with citations
      act5Numbers.tsx              # 1,247 件 · 14.2 h
      act6Mark.tsx                 # wordmark + tagline
```

## Motion grammar

All animations share one timing kit (`src/theme.ts`):

- `ease.brand` — `cubic-bezier(0.22, 1, 0.36, 1)` — signature ease-out, used for the vast majority of entrances
- `ease.crisp` — `(0.16, 1, 0.3, 1)` — for UI elements
- `ease.editorial` — `(0.45, 0, 0.55, 1)` — hold-friendly scene moves
- `ease.pop` — `(0.34, 1.56, 0.64, 1)` — gentle overshoot, used sparingly on KPI counters, badges, shield checks

CSS animations and Tailwind animation classes are **not** used — every motion
is driven by `useCurrentFrame()` + `interpolate()` so the renders are
frame-perfect.

## Picking what to put where on the landing page

- **Top hero slot** — `HeroCinematic` (28 s; can fade-loop at boundaries).
- **Above-the-fold static fallback** — `LogoMinimal` or `LogoBilingual` still.
- **Three-up "what does Zeiro do" row** — `InboxCascade` + `DraftStream` + `TrustRedact`.
- **"The numbers" section** — `KpiCompare` (most legible at a single glance) or
  `KpiCounter` if you want a denser data block.
- **Trust / compliance section** — `TrustVault` for an emotional read, `TrustShield`
  for a checklist read.
- **Footer / "for whom" band** — `JapanMap`.
