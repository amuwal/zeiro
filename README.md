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
  email/       SendGrid Inbound Parse パーサ

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

### SendGrid セットアップ (メール受信 + 送信)

**Inbound Parse**

1. Domain Authentication で `reply.zeiro.jp` (または任意) を認証 — DKIM CNAME を DNS に追加
2. Inbound Parse → 新規ホスト: `inquiry.zeiro.jp` → MX レコードを `mx.sendgrid.net` priority 10 に
3. Webhook URL: `https://YOUR-NGROK.ngrok.io/api/inbound?secret=YOUR_INBOUND_SECRET` (`SENDGRID_INBOUND_WEBHOOK_SECRET` と一致させる)
4. **「POST the raw, full MIME message」をオン** ← ISO-2022-JP の正常処理に必須
5. Basic Auth + サイズ上限 (30MB)

**Mail Send (outbound replies)**

1. Settings → API Keys → Create → Restricted Access → Mail Send のみ
2. キーを `.env` の `SENDGRID_API_KEY` に設定
3. `OUTBOUND_FROM_DOMAIN` は認証済みドメインを使用 (デフォルト `reply.zeiro.jp`)

送信時のFromヘッダ: `"事務所名" <reply@reply.zeiro.jp>`、In-Reply-To/References を自動構築してメールクライアント側でスレッド表示される。

**Event Webhook (delivered / bounce / spam通知)**

1. Settings → Mail Settings → Event Webhook → Enable
2. URL: `https://YOUR-NGROK.ngrok.io/api/webhooks/sendgrid-events`
3. Events to be POSTed: 最低限 `delivered, bounce, dropped, spam_reports` を有効化
4. **Signed Event Webhook を Enable** → 表示された **ECDSA Public Key** を `.env` の `SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY` に設定
5. `delivered` を受信 → `draft.delivered` 監査ログ
6. `bounce` / `dropped` / `spamreport` を受信 → 当該 inquiry を `escalated` に戻し、ドラフトに失敗状態をマーク

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
