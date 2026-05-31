export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zeiro.io').replace(/\/$/, '');
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zeiro.io';

export const BRAND = {
  name: 'Zeiro',
  legalName: 'Zeiro',
  alternateNames: ['ゼイロ', 'ZEIRO', 'zeiro', '税理士事務所のAIエージェント'],
  taglineJa: '税理士事務所のための、顧客対応AI Agent',
  descriptionJa:
    'メール、LINE、Webフォームに届く問い合わせを、事務所のマニュアル・FAQ・顧問先情報・過去回答で自動下書き。引用付き、信頼度判定付き、所長エスカレーション付き。',
  descriptionEn:
    'Zeiro is the customer-correspondence AI agent built for Japanese tax-accountant offices (税理士事務所). It unifies email, LINE, and web-form inquiries; drafts replies grounded in the firm’s own manuals, FAQs, client master, and past answers; cites every claim; and escalates low-confidence cases to the senior partner.',
  emailContact: 'info@zeiro.jp',
  locale: 'ja_JP',
  language: 'ja',
  country: 'JP',
  addressLocality: '東京都千代田区',
  addressRegion: 'Tokyo',
  addressCountry: 'JP',
  sameAs: ['https://app.zeiro.io'],
} as const;

type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Zeiroはどのような税理士事務所向けのAIエージェントですか？',
    a: 'Zeiroは、税理士事務所に届くメール・LINE・Webフォーム・チャットワークなどの顧客問い合わせを自動的に受信し、事務所のマニュアル・FAQ・顧問先マスタ・過去回答ログから根拠を引いて返信ドラフトを生成するAIエージェントです。',
  },
  {
    q: '引用や根拠はどのように示されますか？',
    a: 'すべてのドラフトには、事務所マニュアル §番号、FAQ Q-番号、過去回答の日付、類似度スコアが付帯します。「なぜそう答えたのか」を常に検証できます。',
  },
  {
    q: '低信頼の案件はどう扱われますか？',
    a: '0–1の信頼度スコアが事務所が設定した閾値（既定 0.70）を下回ると、Zeiroは自動送信せず、所長へエスカレーションして承認を仰ぎます。',
  },
  {
    q: '対応チャネルは何ですか？',
    a: 'メール（IMAP / Gmail / Microsoft 365）、LINE公式アカウント、Chatwork、Slack Connect、Webフォーム、SMS、電話の文字起こし、国税庁の通達、TKC・freee・弥生・MFクラウドなどを統合受信できます。',
  },
  {
    q: 'データはどこに保管されますか？',
    a: '日本国内のデータセンター（jp-tokyo）にのみ保管し、LLMプロバイダとは学習禁止契約を締結しています。守秘義務（税理士法 §38）の遵守を前提に設計しています。',
  },
  {
    q: 'デモはどのように予約できますか？',
    a: '公式サイトのフォームからメールアドレスをご登録ください。30分のデモは無料で、事務所マニュアルPDFを1つお渡しいただければ、貴所のナレッジで動くZeiroをその場で起動します。',
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
  address: {
    '@type': 'PostalAddress';
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
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
    address: {
      '@type': 'PostalAddress',
      addressLocality: BRAND.addressLocality,
      addressRegion: BRAND.addressRegion,
      addressCountry: BRAND.addressCountry,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: BRAND.emailContact,
      availableLanguage: ['ja', 'en'],
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
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
      url: `${SITE_URL}#cta`,
      availability: 'https://schema.org/InStock',
      eligibleRegion: { '@type': 'Country', name: 'Japan' },
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

export function faqLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function structuredData() {
  return [organizationLd(), softwareApplicationLd(), websiteLd(), faqLd()];
}
