import type { GoldenCase } from './types';

/**
 * Golden cases for ongoing eval. The pilot firm's tax accountant labels real
 * past Q&A pairs (~100-300) into this list. Keep ~15% as a permanent holdout
 * that's never used to tune prompts/retrieval.
 */
export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'g1-deadline-confirmation',
    description: '3月決算法人税の申告期限',
    message: {
      subject: '3月決算法人税の申告期限について',
      body: '本年度の法人税の申告について、提出期限と納付期限を改めて確認させていただきたくご連絡しました。当社は3月決算ですので、原則は5月末日と認識しておりますが、念のため正確な日付をいただけますでしょうか。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['事務所マニュアル §4.2'],
    },
  },
  {
    id: 'g2-tax-investigation-urgent',
    description: '【至急】税務調査の事前通知',
    message: {
      subject: '【至急】税務調査の事前通知が来ました',
      body: '本日、税務署より電話がございまして、来月初旬に税務調査を実施したい旨の連絡がありました。',
    },
    expected: { kind: 'escalate' },
  },
  {
    id: 'g3-officer-pay-judgment',
    description: '役員報酬の期中変更（個別判断）',
    message: {
      subject: '役員報酬の期中変更について',
      body: '業績の関係で、私を含む役員2名の月額報酬を下げたいと考えています。税務上、期中の役員報酬の変更は損金算入の可否に影響すると聞いたのですが、当社のケースで何かアドバイスをいただけますか。',
    },
    expected: { kind: 'escalate' },
  },
];
