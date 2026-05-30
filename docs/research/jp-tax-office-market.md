# JP Tax-Office Market — Adoption & Positioning Research

> Synthesized from multi-source web research (May 2026) for Zeiro GTM. Reusable for
> blog posts, landing copy, and Twitter/X threads. Each claim tagged with source
> confidence. **Verify single-sourced/flagged items before quoting externally.**

Target buyer: 税理士事務所 / 会計事務所, 50–300 client firms. Zeiro = AI inquiry-triage
+ cited email drafting that coexists with the firm's accounting stack and reads from freee.

---

## 1. The market has two stacks — and only one is our battlefield

**(a) The accounting/filing stack (system of record) — sticky, NOT our target.**
The market splits into three layers (well-documented framing, repeated across HUPRO,
ユニークス, 中小企業税務経営研究協会):
- **Cloud SaaS**: freee, マネーフォワード クラウド (MFクラウド)
- **Installed PC packages**: 弥生会計, 勘定奉行 (OBC), PCA
- **Firm-integrated (税理士連携) systems**: TKC FXシリーズ, JDL, ミロク MJS, NTTデータ「達人」

A load-bearing fact: **freee/MF do NOT fully cover 税務申告 across all tax types.** Firms
needing complete filing still run MJS/TKC/JDL/達人 — which is why legacy vendors keep
mid/large tax offices even as bookkeeping drifts to cloud.

**(b) The communication layer — fragmented, owned by NOBODY. This is our wedge.**
There is **no dedicated "顧問先 inquiry-management" product for tax offices.** Client
questions, document requests, deadline nudges are scattered across **email + Chatwork +
LINE WORKS + phone/FAX**. The recognized pains — **属人化** (one staffer owns a client; work
stops when they're out; knowledge lost on departure) and **response delays** — are
articulated *by adjacent vendors selling chat*, not by anyone selling triage + drafting.

## 2. TKC's lock-in (why mid/large firms are sticky)
- TKC全国会: **11,500 member professionals** (2025-06-30); TKC markets "全国の税理士事務所の
  33%超" (**vendor self-report — flag**).
- FXシリーズ: **300,000+ client companies** (Dec 2022). **36.3% of e-filing-mandated large
  corporations** file corporate tax via TKC (2021).
- **Lock-in is relational, not just technical**: FX is *not sold retail* — a company can only
  adopt it through a TKC-member tax office under a **monthly 巡回監査** engagement
  (~¥8,000–10,000/client/mo). Migrating *off* TKC is a known nightmare (one tax classification
  stored per journal entry → painful export).

## 3. Switching costs: for a comms layer there's almost nothing to migrate
- Core accounting is genuinely sticky (TKC rental lock-in; 弥生→達人 needs a "裏技" workaround;
  competitors like キーパー財務 *waive product fees* to subsidize switching).
- **But Zeiro is additive.** Adopting it moves only three things, none locked in the accounting DB:
  (a) **client master** — via freee API for freee firms, CSV fallback otherwise;
  (b) **inbound routing** — a mail-forward / alias, not a migration;
  (c) **past Q&A → knowledge base** (what we cite from).
- The proven, trusted JP onboarding primitive is **"forward your inbox / point an alias at us —
  don't change your address, don't OAuth your whole mailbox"** (yaritori: "メールアドレスを
  入力するだけのシンプル3ステップ"; メールディーラー: "メールアドレスやメールサーバーを変更する必要はない").
  It's also the 守秘義務-safer path (no third party reading the whole mailbox).
- **Setup is hours, not weeks** when additive. "最短3日" / 即日 are credible promises in this
  market (AIFlowDX, Re:lation 即日, Tayori "最短1分"). Multi-week timelines are associated with
  core-ledger migrations — distance Zeiro from those explicitly.

## 4. Why firms adopt or reject — the forcing functions
- **人手不足 is the #1 driver of AI interest.** Open-practice 税理士 average age **>60**;
  ~half are 60+; under-30s ~11%. Effective jobs-to-applicants **2.31× (FY2024) vs 1.25×
  all-industry**. They cannot hire their way out — frame Zeiro as **headcount relief**
  ("juniorの一次対応をAIが下書き"), not "AI replacing the 税理士".
- Other forcing functions: **インボイス制度 / 電子帳簿保存法** deadline spikes; **phone-load pain**
  (firms adopt fondesk to offload calls).
- A "we manage fine" firm needs a *forcing function, not a comfort upgrade*.

## 5. 守秘義務 (税理士法§38) is the #1 gating objection — and our strongest moat-as-messaging
A practicing 税理士's published **"AI 守秘義務 checklist (2025)"** is a five-item list Zeiro
already satisfies architecturally:

| Practitioner checklist item | Zeiro guarantee |
|---|---|
| 委託契約/DPA, no re-subcontract, delete-on-request | contractual |
| 学習不使用 (no-training / zero-retention) | no-training LLM contract |
| 情報マスキング (never input マイナンバー/口座番号) | `maskMyNumber` on ingest, before any LLM call |
| 承認フロー: AI下書き→担当レビュー→税理士承認→送付 | enforced; no auto-send |
| 環境検証: 国内保管・暗号化・アクセスログ | jp-tokyo residency + audit log of every send |

Lead the 士業 pitch with these as **named compliance checkboxes**, quoting practitioners'
own framework. Get **Pマーク/ISMS** on the roadmap (table-stakes credibility). The deciding
factor in this market is often **trust + responsive human support**, not feature count.

## 6. The real competitor is ChatGPT, not another product
No verifiable competitor does Zeiro's exact loop (incoming question → cited draft from the
firm's *own* prior answers → 税理士 reviews → sends) **purpose-built for 税理士事務所**. The real
"incumbent" is a firm **pasting into ChatGPT Team / Claude Projects** (~$25–30/user). We beat
that on: zero-config grounding, citation discipline (no hallucination), auto-triage (no
copy-paste), freee citations, and 守秘義務 compliance as a product. **The category must be
taught** — DIY-LLM is the habit to displace.

## 7. Distribution
- **Warmest channel = the freee advisor ecosystem.** Because Zeiro integrates freee, freee
  認定アドバイザー firms are cloud-comfortable, self-selected tech-forward, and reachable via
  freee's 税理士検索 / events / marketplace. (freee advisor: シンプル ¥49,800/yr; requires freee
  実装 at ≥3 clients + a certification; 5-tier ranking with revenue payouts at Prime.)
- Broad channel: **税理士界 trade press** (税のしるべ), **AI study groups** (F&M's AI研究会 passed
  170 firms — real appetite), word-of-mouth. TKC全国会 is large but closed/competitive.
- **Buying motion**: bottom-up trial (a junior/担当 starts drafting on their own clients →
  internal champion) → **top-down close gated on the 所長's 守秘義務 sign-off.**

## 8. Pricing norms
- Market has both **per-client** (TKC, freee licenses) and **flat-all-clients** (MyKomon —
  "cost doesn't grow as clients grow") models. At 50–300 clients, **per-client pricing faces
  resistance** given MyKomon's flat precedent. Lean flat/seat.
- **初期費用 is NOT universally zero** in JP (Re:lation ¥50,000), but the lightest-touch
  self-serve segment (Chatwork/yaritori/Tayori) deliberately avoids it. **Lean no-初期費用,
  free trial 1–4 weeks, self-serve** to win the conservative non-technical buyer.

## 9. Headline stats (citable)
- Cloud accounting among 個人事業主: **~33.7% (2024)** — still a minority after a decade.
- 個人事業主 cloud share: 弥生 **55.4%**, freee **24.0%**, MF **14.3%** (MM総研, Apr 2025).
  *Note: this is sole-proprietor share, NOT tax-firm-side share — don't conflate.*
- 法人 cloud share is **fragmented and source-dependent** (freee leads some cuts; Yayoi/MF/
  勘定奉行 in others) — **don't assert a single number.**

## 10. Evidence-quality flags
- **Vendor self-report**: TKC "33% of all tax offices."
- **Single-sourced / unverified**: a formal 日税連 generative-AI guideline (exact provisions +
  date) and TKC "AI-TAX ¥30,000/mo beta" both trace to one 2026-03 aggregator (kaikei-ai.jp);
  the "66% 士業 AI usage (Legalscape 2025)" stat; Chatwork's exact 620k/7.3M figures.
- **Thin**: no quantified survey of *how tax offices communicate with clients* by channel;
  phone/FAX volume; firm-size-segmented tool adoption.
- **Whitespace claim** ("no competitor does our exact loop") — verify against named competitors
  before stating externally.

## 11. Key sources
- MM総研 cloud-accounting survey 2025 — https://www.m2ri.jp/release/detail.html?id=672
- freee 認定アドバイザー — https://adv.freee.co.jp/advisor · benefits https://adv.freee.co.jp/advisor/benefits
- Chatwork 士業 solution — https://go.chatwork.com/ja/solutions/professional/ · 三宅税理士 (~90% clients) https://go.chatwork.com/ja/case/miyake-tax.html · SMC (1,400+ clients) https://go.chatwork.com/ja/case/smc.html
- LINE WORKS tax cases — https://line-works.com/cases/
- fondesk (phone offload) — https://www.fondesk.jp/stories/27/
- 達人 sub-10-person cases — https://www.tatsuzin.info/casestudy/
- TKC AI guidance (2023-10) — https://www.tkc.jp/ao/topics/202310_special02/ · 辻・本郷 AI guideline https://www.ht-tax.or.jp/generative-ai_utilization_guideline.php
- 税理士法 §38 — https://laws.e-gov.go.jp/law/326AC1000000237
- MF partner (labor shortage/AI, 2026) — https://biz.moneyforward.com/mfc-partner/blog/10961/
- 税理士 demographics — https://www.jmsc.co.jp/knowhow/topics/11841.html
- TKC migration lock-in — https://aiknot.jp/media-top/?p=1289
- 守秘義務×AI practitioner checklist — note.com/「税理士×AI 守秘義務 実務チェックリスト5」(今村, 2025-09-08)
- freee founding/insurgent strategy — https://industry-co-creation.com/management/23778
