# Zeiro

> 税理士事務所向け 顧客対応AIエージェント

顧問先からの問い合わせメールを自動でトリアージし、事務所固有のナレッジに基づいた一次回答を下書きする。税理士は本当に判断が必要な案件にだけ集中できる。

詳細は [requirements.md](./requirements.md)、コードルールは [CLAUDE.md](./CLAUDE.md) を参照。

## 構成

```
apps/
  web/         Next.js 16 — レビューUI / Inbound webhook   (port 6001)
  agents/      Mastra 1.8 — トリアージ・下書き・ワークフロー (port 6002)

packages/
  core/        共有 Zod スキーマ・PII マスク・ドメインエラー
  db/          Prisma 6 schema + マイグレーション + リポジトリ
  email/       Resend アダプタ (送信 + Inbound/Event パーサ)

docker-compose.yml   pgvector Postgres (port 6432) — ローカル開発用
```

## 開発の始め方

```bash
docker compose up -d                            # Postgres + pgvector を起動
pnpm install                                    # Prisma generate も実行される
cp .env.example .env                            # APIキー・DB URL・Clerk キーを埋める
pnpm --filter @zeiro/db db:deploy               # マイグレーション適用 (init + users)
pnpm dev                                        # web + agents 並行起動
```

### Clerk セットアップ (初回のみ)

1. https://dashboard.clerk.com で application を作成
2. **User & Authentication** → **Email, Phone, Username** で Email を有効化、**Social Connections** で Google を有効化
3. **Organizations** を有効化 (Settings → Organizations → Enable)
4. **API Keys** から `Publishable key` と `Secret key` を `.env` の `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` に設定
5. **Webhooks** → 新規エンドポイント追加: `http://localhost:6001/api/webhooks/clerk`
   - イベント選択: `user.created`, `user.updated`, `organization.created`, `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
   - 表示された **Signing Secret** を `.env` の `CLERK_WEBHOOK_SECRET` に設定
6. ローカル開発時はngrok等でwebhookを公開: `ngrok http 6001` → 上記URLを置換

### Inngest セットアップ (ローカル開発)

Inngest CLI が dev サーバを兼ねます。`pnpm dev` と並行で起動:

```bash
npx inngest-cli@latest dev -u http://localhost:6001/api/inngest
```

- ダッシュボード: http://localhost:8288
- `draft-inquiry` 関数が登録され、`inquiry.queued` イベントを購読 → メール受信 → Webhookが即200を返してキューイング → Inngest がエージェントを駆動
- 本番では https://app.inngest.com で app を作成し、`INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` を設定

### Resend セットアップ (メール受信 + 送信)

メール送受信は [Resend](https://resend.com) を使用 (ADR-9 で SendGrid から移行)。RFC-5322 の Message-ID / In-Reply-To / References ベースのスレッディングはそのまま。送受信・イベントの抽象境界は `packages/email`。

**ドメイン認証**

1. Resend → Domains で `reply.zeiro.io` (または任意の送信ドメイン) を追加 → 表示された SPF / DKIM の DNS レコードを登録
2. 送信時の From / Reply-To は事務所ごとの inbound アドレス (`inquiry-{slug}@reply.zeiro.io` — org 作成時に Clerk webhook が自動採番)

**Inbound (メール受信)**

1. Resend → Inbound で受信用ドメインの MX を設定 (Resend が MIME 解析を代行)
2. Webhook URL: `https://YOUR-NGROK.ngrok.io/api/inbound` (Svix 署名で検証)
3. シークレットを `.env` の `RESEND_INBOUND_WEBHOOK_SECRET` に設定
4. 受信 → `parseResendInbound` が Resend の parsed-JSON を `IncomingMessage` に正規化 → Webhook が即200を返してキューイング

**送信 (outbound replies)**

1. Resend → API Keys → Create (Sending access)
2. キーを `.env` の `RESEND_API_KEY` に設定
3. 送信は `resend` SDK 経由 (`resend.emails.send`) — 自前の Message-ID / In-Reply-To / References ヘッダと冪等キー等の tags を付与してスレッド表示される

**Event Webhook (sent / delivered / bounced / complained 通知)**

1. Resend → Webhooks → 新規エンドポイント: `https://YOUR-NGROK.ngrok.io/api/webhooks/resend` (Svix 署名で検証)
2. 署名シークレットを `.env` の `RESEND_EVENT_WEBHOOK_SECRET` に設定
3. `email.delivered` を受信 → `draft.delivered` 監査ログ
4. `email.bounced` / `email.complained` / `email.failed` を受信 → 当該 inquiry を `escalated` に戻し、ドラフトに失敗状態をマーク

### ロールと権限 (RBAC)

認可は `membership.appRole` で決まる (Clerk の org ロールは課金管理者の対応付けのみ)。4 ロール:

| ロール | 日本語 | 権限 |
| --- | --- | --- |
| `owner` | 所長 | 全権限 (連携・メンバー管理・削除要求/RTBF・請求)。事務所に1名以上 |
| `reviewer` | 税理士 | 問い合わせ対応・送信・ナレッジ編集・顧問先管理 |
| `staff` | 補助者 | 下書きのみ。送信は `can_send` フラグ次第 (既定 off) |
| `viewer` | 閲覧 | 閲覧のみ |

直交するフラグ: `membership.can_send` (個別の送信許可) と `membership.client_scope` (`assigned` | `all`)。staff / viewer は §54 守秘義務の need-to-know により既定で担当顧問先のみ (`assigned`)。顧問先ごとの担当は `client_assignees` テーブル。

- 判定: `@zeiro/core` の `can(actor, action)`
- Server Action: `requireCan('<action>')` (`apps/web/lib/authz.ts`、拒否時 `ForbiddenError`)
- ページ/ルート: `ctxCan(ctx, action)`
- リポジトリ: 非管理者が到達する一覧/取得は `viewerScope(ctx)` で担当のみに絞り込む

### freee 連携

会計データの読み取り連携 (read-only)。

- スコープは `read` のみ — 書き込みは一切行わない
- OAuth は `prompt=select_company` で事業所を明示選択
- 事業所紐付けは `client_integration_bindings` (顧問先↔freee 事業所)。`client_assignees` は担当者用で別物
- エージェントの `lookup-freee-books` ツールが取引/取引先を取得 → `propose-draft` に `freeeFacts` として渡る → 下書きに `freee会計データ` として引用付きで反映
- 読み取りは毎回 `integration.freee_data_accessed` で監査 (誰が・どの顧問先・スコープ・件数。取引内容は記録しない)
- freee アプリストアの審査前アプリは **20 事業所** が上限 — スケール前に本番審査の通過が必要

### ナレッジ追加 (運用)

`/knowledge/new` から取り込み:
- **出典名** (例: `事務所マニュアル §4.2`、`FAQ集 Q-018`) — 後で下書きの引用に表示される
- **本文** (テキスト直接貼り付け) または **ファイル** (`.txt` / `.md` / `.eml`)
- `.eml` の場合は「メールとして解析」をオン → `mailparser` でヘッダ除去 + 本文抽出
- 内部処理: 文単位 (`。．！？\n`) で 400 文字を上限にチャンク + 1文オーバーラップ → OpenAI `text-embedding-3-small` で埋め込み → pgvector に挿入 + メタデータ (`documentId`, `chunkIdx`, `embeddingModel`, `requiresReview: false`)
- 取り込み完了後、`/knowledge?ingested=N` にリダイレクトしバナー表示
- 法改正等で再レビュー必要にする場合は当該 `documentId` のチャンクの `metadata.requires_review = true` にすると検索対象から自動除外 (UI は Phase-2)

### 検索パイプライン (内部動作)

エージェントの `knowledge-search` ツールはハイブリッド検索:

1. **ベクトル**: pgvector cosine top-30 (OpenAI text-embedding-3-small)
2. **BM25**: Postgres FTS `ts_rank_cd` top-30 (`simple` configuration、tsvector GIN index)
3. **RRF 融合**: 1/(k+rank), k=60 → 上位 10 件
4. **Cohere Rerank 3.5**: top-5
5. **閾値**: relevance_score < 0.3 を切り捨て → 残り 0 件なら no_draft

`COHERE_API_KEY` を設定しない場合は (3) の RRF 結果がそのまま使われる (劣化動作)。Phase-2 で日本語に強い `pg_textsearch` + Sudachi tokenizer に置換予定。

### 下書き生成パイプライン

エージェントの draft step は以下の順:

1. **エスカレーション判定** (rule-based) — 信頼度 < 0.75、税務質問+判断要素、顧問契約カテゴリ、緊急キーワードの場合 → `kind: 'escalate'`
2. **ハイブリッド検索** — 0件なら `kind: 'no_draft'` (refusal gate 1)
3. **Anthropic Citations API** — 取得した chunks を `documents` ブロックとして送信、本文生成 + 引用ポインタを自動付与 (`@anthropic-ai/sdk` 直接呼び出し、Mastra agent 経由しない)
4. **Citation verifier** — 引用が 0 件なら `kind: 'no_draft'` (refusal gate 2)
5. 件名は `Re:` prefix、信頼度は `min(1, citations / 3)`

`cited_text` は出力トークンに加算されないため Citations API のオーバーヘッドはほぼ無し。

### Eval ランナー

Golden set に対してパイプラインをまとめて実行・評価:

```bash
EVAL_FIRM_ID=<your-firm-uuid> pnpm --filter @zeiro/agents eval
```

出力: 各ケースの `kind` 一致 / citation count / 期待 source の含有率、サマリで合格率と平均引用数。
パイロット税理士事務所が過去 Q&A 100〜300 件をラベル付けして [`apps/agents/src/eval/golden-set.ts`](apps/agents/src/eval/golden-set.ts) に追加 → 週次で実行 → 回帰検出。

### Observability セットアップ (任意 — 設定しなければ静かに無効化)

**Sentry** — エラー監視:
1. https://sentry.io でプロジェクトを2つ作成 (web 用と agents 用、または共有)
2. 各 DSN を `.env` に設定 (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`)
3. 本番ビルド時のソースマップアップロード用に `SENTRY_ORG` / `SENTRY_PROJECT` も設定

**Langfuse** — LLMトレース:
1. https://cloud.langfuse.com でプロジェクトを作成
2. API Keys → Public + Secret を `.env` の `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` に設定
3. agents service が起動するとMastraがLLM呼び出しをLangfuseへ自動送信
4. すべての trace は出力前に `redactPIIDeep()` でマイナンバー・メール・電話番号をマスク

`SENTRY_DSN` も `LANGFUSE_PUBLIC_KEY` も未設定の場合、両方とも no-op で動作する。

### デモデータの投入 (Clerk と紐付ける)

Clerk で組織を作成後、その `org_id` を取得してデモデータと紐付けます:

```bash
# Clerk Dashboard → Organizations → 対象orgのIDをコピー (org_xxx形式)
SEED_LINK_TO_CLERK_ORG=org_XXXX pnpm --filter @zeiro/db db:seed
# 同じ Clerk org でサインインすると、シードデータが受信トレイに表示される
```

- web: http://localhost:6001
- agents (Mastra Playground): http://localhost:6002
- Prisma Studio: `pnpm --filter @zeiro/db db:studio` → http://localhost:6080

## スクリプト

| コマンド                                              | 用途                              |
| ----------------------------------------------------- | --------------------------------- |
| `pnpm dev`                                            | web + agents の並行起動           |
| `pnpm dev:web`                                        | web のみ                           |
| `pnpm dev:agents`                                     | agents のみ                        |
| `pnpm typecheck`                                      | 全パッケージの tsc --noEmit       |
| `pnpm lint` / `pnpm lint:fix`                         | Biome                              |
| `pnpm --filter @zeiro/db db:migrate -- --name <slug>` | 新規マイグレーション作成          |
| `pnpm --filter @zeiro/db db:deploy`                   | 既存マイグレーション適用 (本番)   |
| `pnpm --filter @zeiro/db db:seed`                     | デモデータ投入                     |
| `pnpm --filter @zeiro/db db:studio`                   | Prisma Studio                     |
| `docker compose up -d` / `docker compose down`        | ローカル Postgres                 |

## DB

- ローカル開発: Docker `pgvector/pgvector:pg17` (`postgres://zeiro:zeiro@localhost:6432/zeiro_dev`)
- 本番: Neon (`DATABASE_URL` が `*.neon.tech` を含むと自動的に Neon serverless adapter に切替)
- pgvector 1536 次元 (OpenAI `text-embedding-3-small`)

## ポート

`6xxx` を本プロジェクト専用に予約。
`6001` web / `6002` agents / `6080` Prisma Studio / `6432` Postgres。
