export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zeiro.io').replace(/\/$/, '');
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zeiro.io';

export const BRAND = {
  name: 'Zeiro',
  legalName: 'Zeiro',
  alternateNames: ['ゼイロ', 'ZEIRO', 'zeiro', '税理士事務所のAIエージェント'],
  taglineJa: '人が確認して送る、税理士事務所の顧客対応AI',
  descriptionJa:
    'Zeiroは税理士事務所向けの初期α版AIです。メール、LINE、Chatwork、Webフォームの問い合わせに、事務所の情報を参照した返信案を作成。引用数に基づく信頼度を表示し、すべて人が確認して送信します。',
  descriptionEn:
    'Zeiro is an early-alpha correspondence AI for Japanese tax-accountant offices. It handles email, LINE, Chatwork, and web-form inquiries, drafts replies from firm-provided knowledge, displays source references and confidence, and requires human approval before sending.',
  emailContact: 'info@zeiro.jp',
  locale: 'ja_JP',
  language: 'ja',
  sameAs: [APP_URL],
} as const;

type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Zeiroはどのような税理士事務所向けのAIエージェントですか？',
    a: 'Zeiroは初期α版の顧客対応AIです。メール・LINE・Chatwork・Webフォームの問い合わせを整理し、事務所のマニュアル・FAQ・顧問先情報・過去回答を参照して返信案を作成します。',
  },
  {
    q: '引用や根拠はどのように示されますか？',
    a: '返信案には、生成時に参照したマニュアル、FAQ、顧問先情報、過去回答などを表示します。引用は正しさの保証ではないため、担当者が元資料と照合してから送信します。',
  },
  {
    q: '返信案は自動送信されますか？',
    a: 'いいえ。α版では信頼度にかかわらず、すべての返信案を人が確認してから送信します。税務判断、緊急性、根拠不足などがある案件は、人への引き継ぎ候補として扱います。',
  },
  {
    q: '対応チャネルは何ですか？',
    a: '現在のα版で対象にしている問い合わせチャネルは、メール（Resend経由）、LINE公式アカウント、Chatwork、Webフォームです。freee連携は会計データの読取専用で、書き込みは行いません。',
  },
  {
    q: 'どのようなデータ保護機能がありますか？',
    a: '問い合わせ本文と解析した添付テキスト内の12桁番号パターンのマスキング、事務所（テナント）単位のアクセス制御、送信・却下の監査ログを実装しています。件名は現在マスキング対象外です。サービスは共有型マルチテナント構成で、クラウド・AIなどの外部事業者を利用します。実データを扱う前に処理条件をご確認いただきます。',
  },
  {
    q: 'デモはどのように予約できますか？',
    a: '公式サイトのフォームからメールアドレスをご登録ください。架空の問い合わせとナレッジを使った15分ほどの無料デモをご案内します。事務所マニュアルや実際の顧客データは不要です。',
  },
];

export type OrganizationLd = {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  alternateName: readonly string[];
  url: string;
  logo: string;
  email: string;
  description: string;
  inLanguage: string;
  contactPoint: {
    '@type': 'ContactPoint';
    contactType: string;
    email: string;
    availableLanguage: string[];
  };
  sameAs: string[];
};

export function organizationLd(): OrganizationLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    alternateName: BRAND.alternateNames,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    email: BRAND.emailContact,
    description: BRAND.descriptionJa,
    inLanguage: BRAND.language,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'product inquiries',
      email: BRAND.emailContact,
      availableLanguage: ['ja'],
    },
    sameAs: [...BRAND.sameAs],
  };
}

export function softwareApplicationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND.name,
    alternateName: BRAND.alternateNames,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Tax & Accounting AI Agent',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: BRAND.descriptionJa,
    inLanguage: BRAND.language,
    audience: {
      '@type': 'Audience',
      audienceType: '税理士事務所 / Japanese tax-accountant offices',
    },
    creator: {
      '@type': 'Organization',
      name: BRAND.name,
      url: SITE_URL,
    },
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    alternateName: BRAND.alternateNames,
    url: SITE_URL,
    inLanguage: BRAND.language,
    description: BRAND.descriptionJa,
    publisher: {
      '@type': 'Organization',
      name: BRAND.name,
      url: SITE_URL,
    },
  };
}

export function structuredData() {
  return [organizationLd(), softwareApplicationLd(), websiteLd()];
}
