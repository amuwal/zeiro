# Embeddings + AI-stack residency — findings (May 2026)

> Parked pending a GCP/Vertex decision (founder). Captures the Gemini embedding
> options + a real compliance gap surfaced while investigating them.

## Gemini embedding models
- **`gemini-embedding-001`** (GA, Jul 2025) — **text-only**. Top of multilingual MTEB (~68 vs ~62 for OpenAI `text-embedding-3-small`) → a real **Japanese retrieval** upgrade. Emits **1536-dim** (MRL) → drops into our existing `pgvector(1536)` column with no schema change (but a full corpus **re-embed**; ~7.5× the per-token cost — small in absolute terms). Max input 2,048 tokens (lower than 3-small's 8,191). Supports `task_type` (RETRIEVAL_DOCUMENT/QUERY).
- **`gemini-embedding-2`** (Public **Preview**, Mar 2026) — "first natively multimodal embedding model": embeds **PDF (≤6 pages)**, images, audio, video into one space. 8,192-token text, 1536/3072 MRL.
  - **Why it's NOT a silver bullet for us:** we still need the **extracted text** downstream — to **mask My Number before the LLM (§38)**, to **cite** the source, and to **show the reviewer**. An opaque multimodal vector can't be masked, cited, or read. So native-doc *embedding* doesn't remove text extraction. Plus Preview (no SLA) + jp-residency unconfirmed.
- **Vertex `multimodalembedding@001`** — older; text capped ~32 tokens → unusable for chunk retrieval. Ignore.

**Recommendation:** pilot **`gemini-embedding-001`** behind a swappable embedding provider + a JP 税務-corpus retrieval eval (JMTEB-style) vs `text-embedding-3-small`; switch only if it measurably wins. `gemini-embedding-2` = watch, don't adopt.

## ⚠️ AI-stack residency gap (current state)
- Triage + reflector use **`@ai-sdk/google` + `GOOGLE_GENERATIVE_AI_API_KEY`** = Google **AI Studio / Developer API**, which per Google's terms: **free tier trains on inputs + human review** (disqualifying for 守秘義務); **paid Developer API is no-training but "cached in any country"** → **no jp-region pinning** (violates our `jp-tokyo`-only rule).
- Embeddings = **OpenAI (US)**; drafting = **Anthropic (US)**. All no-training by default, but **none jp-tokyo-resident** on current config.
- Net: we satisfy **no-training** (mostly) but **not strict jp-tokyo residency** on any LLM call today. A blocker for a 法人 security review.

**Fix (one move, also delivers the embedding upgrade): consolidate on Vertex AI `asia-northeast1` (Tokyo).**
- Gemini triage + `gemini-embedding-001` on Vertex Tokyo → no-training + jp-residency (+ JP retrieval win).
- Claude drafting is available on **Vertex AI** → Tokyo-pinned + no-training too.
- Requires: a paid GCP project; confirm each model is served from `asia-northeast1` (newer/Preview models land in us-central1/global first); enable Zero Data Retention / abuse-logging exception.
- **Verify before building:** which embedding models are callable from `asia-northeast1`; Claude-on-Vertex Tokyo availability; exact rate limits.

## Data governance summary (Google)
- AI Studio FREE → trains on data + human review. **Never for client data.**
- Paid Developer API → no-training, but cached in any country (no residency).
- **Vertex AI → no-training + region pinning (Tokyo) + optional ZDR. The compliant path.**

Sources: ai.google.dev (embeddings/models/pricing/terms), Vertex data-governance + locations docs, blog.google gemini-embedding-2 (Mar 2026), arxiv 2503.07891 (MTEB 68.32).
