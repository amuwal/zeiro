import type { GoldenCase } from './types';

// Pilot firms can extend this set by labelling real past Q&A pairs (target
// ~100-300 cases, with ~15% held out as a permanent set never used to tune
// prompts or retrieval). The seeded fixtures intentionally use short content
// per chunk so the cases here exercise BM25 and citation grounding rather
// than relying on dense semantic recall.
export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'g01-march-corporate-deadline',
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
    id: 'g02-tax-investigation-urgent',
    description: '【至急】税務調査の事前通知 — エスカレーション',
    message: {
      subject: '【至急】税務調査の事前通知が来ました',
      body: '本日、税務署より電話がございまして、来月初旬に税務調査を実施したい旨の連絡がありました。何をどう準備すればよいか分からず不安です。',
    },
    expected: { kind: 'escalate' },
  },
  {
    id: 'g03-officer-pay-judgment',
    description: '役員報酬の期中変更（個別判断）',
    message: {
      subject: '役員報酬の期中変更について',
      body: '業績の関係で、役員2名の月額報酬を下げたいと考えています。税務上、期中の役員報酬の変更は損金算入の可否に影響すると聞きました。当社のケースで何かアドバイスをいただけますか。',
    },
    expected: { kind: 'escalate' },
  },
  {
    id: 'g04-payroll-mailing-address',
    description: '源泉徴収票の送付先（退職者・住所変更）',
    message: {
      subject: '源泉徴収票の送付先について',
      body: '4月末に退職した社員の源泉徴収票の送付先について確認させてください。本人が引っ越しをされていまして、新住所への送付で問題ないでしょうか。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['過去回答ログ 2025-11'],
    },
  },
  {
    id: 'g05-year-end-adjustment-schedule',
    description: '年末調整 受付期限のスケジュール',
    message: {
      subject: '年末調整書類の受付期限',
      body: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['FAQ集 Q-007'],
    },
  },
  {
    id: 'g06-etax-required-documents',
    description: 'e-Tax 電子申告 必要書類',
    message: {
      subject: 'e-Taxで法人税の電子申告をするための必要書類',
      body: '今期から法人税の申告をe-Taxで電子提出したいと考えています。当社で準備すべき書類を一覧でいただけますでしょうか。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['e-Tax 優先運用ガイド §6.1'],
    },
  },
  {
    id: 'g07-deadline-calendar-fiscal',
    description: '決算月別 申告期限カレンダーの参照',
    message: {
      subject: '当社（3月決算）の申告期限を確認したい',
      body: '当社は3月決算ですが、決算月別の申告期限カレンダーを参照のうえ、正確な期限を改めてご教示ください。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['FAQ集 Q-018'],
    },
  },
  {
    id: 'g08-client-contract-special-notes',
    description: '顧問契約 特記事項の参照',
    message: {
      subject: '当社の顧問契約 特記事項を再度確認したい',
      body: '当社（山田商事）の顧問契約に含まれる特記事項を改めて確認したくご連絡しました。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['顧問先マスタ C-0142'],
    },
  },
  {
    id: 'g09-customer-complaint-urgent',
    description: '請求金額への異議（クレーム） — エスカレーション',
    message: {
      subject: '請求書の金額についてクレームです',
      body: '先月分の請求書を確認したところ、金額に誤りがあるように見受けられます。至急ご確認のうえご対応ください。',
    },
    expected: { kind: 'escalate' },
  },
  {
    id: 'g10-corporate-tax-payment-deadline',
    description: '法人税納付期限の確認（3月決算）',
    message: {
      subject: '法人税の納付期限について',
      body: '法人税の納付期限についてご教示ください。当社は3月決算で、申告と同時に納付する想定です。',
    },
    expected: {
      kind: 'draft',
      minCitations: 1,
      mustMentionSources: ['事務所マニュアル §4.2'],
    },
  },
  {
    id: 'g11-tax-investigation-prep-protocol',
    description: '税務調査 初動対応 — エスカレーション',
    message: {
      subject: '税務調査の打ち合わせをお願いしたい',
      body: '税務調査の事前通知が届きました。当社として最初に何を準備すればよいでしょうか。打ち合わせもお願いしたく存じます。',
    },
    expected: { kind: 'escalate' },
  },
  {
    id: 'g12-unrelated-vendor-pitch',
    description: '取引先からの営業案内 — 返信不要',
    message: {
      subject: '【ご案内】新サービスのご紹介',
      body: '突然のご連絡失礼いたします。弊社では税理士事務所様向けに新しいクラウドサービスをご提供しております。ご興味があればお打ち合わせの機会をいただけますと幸いです。',
    },
    expected: { kind: 'no_draft' },
  },
];
