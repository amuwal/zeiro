# Zeiro — Homepage Direction Gallery

Three fully built, self-contained homepage candidates for **Zeiro** — the customer-response AI
agent for Japanese tax-accounting firms (税理士事務所). Same product, same brand system, three
distinct ways of telling the story. This folder is a presentation surface for choosing one.

```
homepage-versions/
├── index.html                      ← the gallery (open this first)
├── README.md                       ← you are here
├── assets/
│   ├── still/*.png                 ← reduced-motion posters + brand stills
│   └── video/*.mp4                 ← brand motion (poster / fallback use only)
├── v1-kanpo-broadsheet/index.html
├── v2-utsuwa-cinematic-ink/index.html
└── v3-ugoku-shoko-working-proof/index.html
```

Each version is a **single self-contained `index.html`** (inline CSS + JS, GSAP / ScrollTrigger /
Lenis via CDN, brand fonts via Google Fonts). The only thing they reach outside their own folder
is the shared `../assets/` directory.

---

## How to view

The pages load CDN scripts and the shared `assets/` over relative paths, so **serve over local
HTTP** — do not open via `file://` (CDN + relative assets + some browser security policies misbehave
under `file://`).

From the project root, any static server works. Pick one:

```bash
# Python (no install)
python3 -m http.server 6090 --directory debug/homepage-versions

# Node
npx serve debug/homepage-versions -l 6090
#   or
npx http-server debug/homepage-versions -p 6090
```

Then open <http://localhost:6090/> — the gallery — and click any card.
(`6090` keeps clear of the reserved 6xxx product ports: web `6001`, agents `6002`, Prisma Studio
`6080`, Postgres `6432`. Use any free port you like.)

Direct deep-links once served:

- `http://localhost:6090/v1-kanpo-broadsheet/index.html`
- `http://localhost:6090/v2-utsuwa-cinematic-ink/index.html`
- `http://localhost:6090/v3-ugoku-shoko-working-proof/index.html`

All three ship a full `prefers-reduced-motion` path: the live WebGL/scroll-scrubbed scenes fall back
to the static posters in `assets/still/`, numbers render at their final values, and nothing autoplays.

---

## The three directions

All share one brand system — warm cream paper (`#f2eee6`), deep ink type (`#14110d`), a single
rationed forest-green accent (`oklch(38% 0.045 150)`), Inter Tight + Noto Sans JP + JetBrains Mono,
and the category hues (期日 `#a06f30` ・ 書類 `#2f6868` ・ 税務 `#9a504b` ・ 顧問契約 `#594c7d`). They
diverge in archetype and signature moment.

### 01 — `v1-kanpo-broadsheet` · 官報 / The Daily Ledger
**Editorial / Swiss–Japanese print.** The homepage as a single front page of a tax-profession
broadsheet: a strict 12-column hairline grid with *visible* structure on warm cream, a real masthead
(folio row + live dateline `2026年5月30日 金曜日 · 第38条準拠版`), an asymmetric 7/5 front-page hero,
bylined news-item feature pillars (never icon-card rows), a typeset category legend strip, and one
tonal break — an ink-ground §38 "back-page legal notice" hosting the live KnowledgeConstellation.
**Signature — THE PLATE:** beside the source client email, on the page's only pure-white sheet, Zeiro
composes the reply token-by-token with a green block caret; three citation chips slide up and lock
into a footnote rail joined by 1px green leader lines. *The paper is being typeset, with sources,
before your eyes.*

### 02 — `v2-utsuwa-cinematic-ink` · 墨 / Sumi (Cinematic Ink)
**Cinematic ink — one dramatic WebGL act, then sustained editorial calm.** Act I is a hand-written
WebGL2 ink-diffusion shader (FBM domain-warp + reaction-diffusion ping-pong) in warm graphite, with
forest-green injected only where the field is densest. The cursor is an ink source; citation-card
ghosts condense and dissolve around the focused 下書き node. **Signature — THE DRYING INK:** as you
scroll, the ink field does not fade — it *dries* from the edges inward into cream paper while type
inverts ink-on-white, all scrubbed to scroll position. The body lives calmly on paper; only the final
CTA pools back to ink as a bookend. A baked MP4 can't bloom where the mouse is or dry to scroll velocity.

### 03 — `v3-ugoku-shoko-working-proof` · 動く証拠 / Working Proof
**Product-forward / show-the-work — Linear-grade restraint, the live flow is the hero.** The page
*runs* the product: the reader scrolls through one real inbound email (田中商事's 源泉徴収票 request)
and watches Zeiro triage it, retrieve six firm sources, stream a cited 下書き, and hand it to the
税理士 for a 2〜3分 review — on a single hairline 12-column control surface visible the whole scroll.
Deep-ink is reserved for exactly one section (the RAG/retrieval beat) so the page literally goes dark
to "think," then returns to paper for the review/send payoff. **Signature — WATCH IT DRAFT:** at the
cited words, citation chips fire in and dashed lines snap from each chip to the matching source card
in the constellation — sentence and evidence assemble at the same instant.

---

## The shared `assets/` folder

`assets/still/` and `assets/video/` are produced by the Remotion motion project in
`debug/zeiro-animations/` (see its README). They use the same brand tokens and font stack as the
product UI, so motion lives in the same world.

- **`assets/still/*.png`** — `prefers-reduced-motion` posters and brand stills (e.g.
  `DraftStream.png`, `KnowledgeConstellation.png`, `AgentPipeline3D_f235.png`, `TimeReclaimed_f200.png`,
  `DocumentCoverflow_f205.png`, `VaultSeal_f210.png`). The gallery cards also use these as previews.
- **`assets/video/*.mp4`** — brand motion clips. In the homepages these are used **only** as
  `preload="metadata"`, IntersectionObserver-lazy poster/fallback assets — never an autoplaying hero
  loop. Every "live" scene is rebuilt in-page (DOM / canvas / WebGL), with the still/MP4 as the
  reduced-motion fallback.

If you relocate a version, keep its relative `../assets/...` references intact or copy the referenced
files alongside it.

---

## Porting a chosen version into `apps/web`

These are standalone prototypes (inline everything, CDN scripts). To bring one into the Next.js app
(`apps/web`, App Router + React 19 + Tailwind v4), decompose it rather than dropping the raw HTML:

1. **Carve the page into section components.** Each `<section>` becomes a component under
   `apps/web/app/(marketing)/_components/` (or similar). Respect the **200-line hard cap** per
   `.tsx` file — one file per section / interactive island.
2. **Tokens already exist.** The colors/fonts/radii/shadows used here mirror
   `apps/web/styles/tokens.css`, bridged into Tailwind via `@theme inline` in
   `apps/web/app/globals.css`. Replace inline hex with the bridged token utilities
   (`bg-bg`, `text-ink`, `text-accent`, `border-line`, `rounded-lg`, `shadow-md`, `font-jp`, …).
   **Never hardcode colors** — add a token first if one is missing.
3. **Fonts via `next/font`,** not the Google Fonts `<link>`. Load Inter Tight + Noto Sans JP +
   JetBrains Mono with `next/font/google` and wire the CSS variables to the existing
   `--font-sans / --font-jp / --font-mono`.
4. **Move CDN libs to dependencies.** `pnpm add gsap @studio-freight/lenis` (pin latest stable) and
   import them in `'use client'` islands. Keep heavy scenes (WebGL shader in v2, the live constellation
   / token-stream) as client components, dynamically imported with `next/dynamic` and SSR off, so the
   marketing shell stays server-rendered.
5. **Keep the reduced-motion path.** Port the `prefers-reduced-motion` posters from `assets/still/`
   into `apps/web/public/` (or an imported asset) and preserve the static fallbacks.
6. **No tenant data here.** These are public marketing pages — they touch no firm data, so the
   `requireFirmContext()` / `firmId` rules don't apply. If a CTA later posts a lead/demo request,
   that route handler follows the usual server-action rules (validate input with Zod, add to
   `middleware.ts` `isPublicRoute` if it must be unauthenticated).
7. **SEO + i18n.** Set real `metadata` (the pages are currently `noindex` for the gallery), keep JP as
   the primary language with English as a typographic secondary layer, and preserve the JP typography
   quality (`font-feature-settings: "palt","ss01"`, intentional `<br>` / `word-break`, no orphaned
   punctuation).

Pick one direction in the gallery, then lift its sections into the app following the steps above.
