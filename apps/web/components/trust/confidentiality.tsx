import { Icon } from '@/components/ui/icon';

// The five points 税理士 cite as their AI 守秘義務 (税理士法§38) checklist — each
// mapped to the guarantee Zeiro enforces in code. This is the buyer's #1 gating
// question ("can I trust AI with client secrets?"), so we answer it as concrete,
// verifiable facts rather than a marketing promise. Reusable: settings today,
// landing/onboarding later.
type TrustPoint = {
  title: string;
  detail: string;
};

const POINTS: TrustPoint[] = [
  {
    title: '学習に使わせない契約のAIのみ利用',
    detail: 'お客様の情報をモデルの学習に利用しない契約のプロバイダだけを使用します。',
  },
  {
    title: 'マイナンバー・口座番号を自動マスキング',
    detail: '保存前・AIへの送信前に自動でマスキング。原文がLLMに渡ることはありません。',
  },
  {
    title: '送信前に必ず人が承認',
    detail:
      'AIは下書きまで。担当者のレビューと税理士の承認を経て送信します。AIが顧問先へ直接返信することはありません。',
  },
  {
    title: '出典のない回答はしない',
    detail:
      'すべての下書きは事務所のナレッジやfreeeの会計データを根拠として明示。推測では答えません。',
  },
  {
    title: '国内保管・通信暗号化',
    detail: 'データは国内リージョン（東京）のみで保管し、通信・保存ともに暗号化します。',
  },
  {
    title: 'すべての送信を監査ログに記録',
    detail: '誰が・いつ・どのAIモデルで・どの根拠を引用して送信したかを記録します。',
  },
];

export function ConfidentialityTrust() {
  return (
    <section className="rounded-lg border border-line bg-surface shadow-sm">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
          <Icon name="shield" size={16} />
        </span>
        <div>
          <h2 className="font-sans text-[15px] font-semibold text-ink">守秘義務とセキュリティ</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            税理士法第38条の守秘義務をAI運用でも守るための設計。
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p.title} className="flex items-start gap-2.5 bg-surface px-5 py-3.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent">
              <Icon name="check" size={12} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{p.title}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
                {p.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ConfidentialityTrust;
