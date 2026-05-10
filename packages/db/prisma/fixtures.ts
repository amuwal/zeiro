export const FIRM = {
  name: '税理士法人 凜事務所',
  inboundAddress: 'inquiry@rin-tax.co.jp',
  region: 'jp-tokyo' as const,
};

export const CLIENTS = [
  { name: '株式会社山田商事', email: 'yamada@yamada-shoji.co.jp', contractType: 'standard' },
  { name: '合同会社みらいテック', email: 'suzuki@mirai-tech.jp', contractType: 'standard' },
  { name: '田中製作所株式会社', email: 'misaki.tanaka@tanaka-mfg.co.jp', contractType: 'premium' },
  { name: '株式会社グリーンリーフ', email: 'sasaki@greenleaf.co.jp', contractType: 'standard' },
  { name: '鈴木建設株式会社', email: 'kenji.s@suzuki-kensetsu.co.jp', contractType: 'standard' },
  { name: '株式会社ノーブルデザイン', email: 'nakamura@noble-design.jp', contractType: 'standard' },
  { name: '佐藤クリニック', email: 'sato@sato-clinic.jp', contractType: 'premium' },
  { name: '株式会社ジオメトリクス', email: 'takahashi@geometrics.io', contractType: 'standard' },
];

type Citation = { source: string; snippet: string };
type DraftSpec = {
  subject: string;
  body: string;
  citations: Citation[];
  confidence: number;
  model: string;
};

export type InquirySpec = {
  messageId: string;
  clientEmail: string;
  receivedAt: string;
  subject: string;
  body: string;
  status: 'pending' | 'drafted' | 'sent' | 'rejected' | 'escalated';
  analysis: {
    category: string;
    confidence: number;
    urgency: 'high' | 'medium' | 'low';
    requiresTaxJudgment: boolean;
    reason: string;
  };
  draft?: DraftSpec;
};

export const INQUIRIES: InquirySpec[] = [
  {
    messageId: 'INQ-2026-0418',
    clientEmail: 'yamada@yamada-shoji.co.jp',
    receivedAt: '2026-05-09T01:42:00Z',
    subject: '3月決算法人税の申告期限について確認させてください',
    body: '税理士法人 凜事務所 ご担当者様\n\nいつもお世話になっております。山田商事 経理部の山田です。\n\n本年度の法人税の申告について、提出期限と納付期限を改めて確認させていただきたくご連絡しました。\n当社は3月決算ですので、原則は5月末日と認識しておりますが、念のため正確な日付をいただけますでしょうか。\n\nまた、e-Taxでの電子提出を希望しております。必要な書類があれば併せてご教示ください。',
    status: 'drafted',
    analysis: {
      category: '期日確認',
      confidence: 0.94,
      urgency: 'low',
      requiresTaxJudgment: false,
      reason:
        '「申告期限」「納付期限」「3月決算」の語句と過去同様の問い合わせパターンから「期日確認」と判定。',
    },
    draft: {
      subject: 'Re: 3月決算法人税の申告期限について',
      body: '山田 正彦様\n\nいつもお世話になっております。\n\nご照会いただきました法人税の申告・納付期限につきまして、以下のとおりご回答申し上げます。\n\n■ 提出期限・納付期限\n貴社は3月決算（事業年度末: 2026年3月31日）ですので、\n  ・法人税申告書の提出期限: 2026年5月31日（日）\n     ただし当日が日曜のため、翌営業日 6月1日まで\n  ・法人税の納付期限: 同日（提出と同日まで）\n  ・地方法人税・法人事業税・法人住民税: 同様に6月1日が期限\n\n■ e-Tax電子提出について\n電子申告ご希望の旨、承知いたしました。当事務所では原則すべての法人申告をe-Taxにて行っております。\n貴社からご準備いただく書類は以下のとおりです：\n  1. 決算書（PL/BS/SS）\n  2. 勘定科目内訳明細書\n  3. 事業概況説明書\n\n参照元: 事務所マニュアル §4.2 / FAQ集 Q-018',
      citations: [
        { source: '事務所マニュアル §4.2', snippet: '法人税申告書 提出期限の運用ルール' },
        { source: 'FAQ集 Q-018', snippet: '決算月別 申告期限カレンダー（3月決算）' },
        { source: 'e-Tax 優先運用ガイド §6.1', snippet: '電子申告における必要書類一覧' },
      ],
      confidence: 0.92,
      model: 'claude-sonnet-4-6',
    },
  },
  {
    messageId: 'INQ-2026-0417',
    clientEmail: 'suzuki@mirai-tech.jp',
    receivedAt: '2026-05-09T01:21:00Z',
    subject: '【至急】税務調査の事前通知が来ました',
    body: '凜事務所 担当者様\n\nお世話になっております。合同会社みらいテック 代表の鈴木です。\n\n本日、税務署より電話がございまして、来月（6月）初旬に税務調査を実施したい旨の連絡がありました。\n正直なところ、何をどう準備すればよいか分からず、不安です。近日中にお打ち合わせのお時間をいただけませんでしょうか。',
    status: 'escalated',
    analysis: {
      category: '税務質問',
      confidence: 0.62,
      urgency: 'high',
      requiresTaxJudgment: true,
      reason:
        '「税務調査」キーワードを検知。緊急度フラグが立つカテゴリのため、所長への即時エスカレーションを推奨。',
    },
  },
  {
    messageId: 'INQ-2026-0416',
    clientEmail: 'misaki.tanaka@tanaka-mfg.co.jp',
    receivedAt: '2026-05-09T00:58:00Z',
    subject: '源泉徴収票の送付先について',
    body: '退職者（4月末退職）の源泉徴収票の送付先について確認させてください。\n本人が引っ越しをされていまして、新住所への送付で問題ないでしょうか。',
    status: 'drafted',
    analysis: {
      category: '書類提出',
      confidence: 0.91,
      urgency: 'low',
      requiresTaxJudgment: false,
      reason:
        '「源泉徴収票」「送付先」「住所変更」のパターンに完全一致。過去回答ログに同種事例が複数。',
    },
    draft: {
      subject: 'Re: 源泉徴収票の送付先について',
      body: '田中 美咲様\n\nお問い合わせありがとうございます。\n\n退職者本人より新住所をご申告いただいている場合、当該新住所への送付で問題ございません。\n念のため、送付前にメール等で本人へ送付先の最終確認を行うことをお勧めいたします。\n\nまた、住民税の特別徴収から普通徴収への切替手続きにつきましても、市区町村への異動届出書を別途ご提出いただく必要があります。\n\n参照元: 過去回答ログ 2025-11',
      citations: [
        { source: '過去回答ログ 2025-11', snippet: '源泉徴収票 送付先運用（住所変更時）' },
      ],
      confidence: 0.89,
      model: 'claude-sonnet-4-6',
    },
  },
  {
    messageId: 'INQ-2026-0415',
    clientEmail: 'sasaki@greenleaf.co.jp',
    receivedAt: '2026-05-09T00:14:00Z',
    subject: '役員報酬の期中変更について',
    body: '業績の関係で、私を含む役員2名の月額報酬を下げたいと考えています。\n税務上、期中の役員報酬の変更は損金算入の可否に影響すると聞いたのですが、当社のケースで何かアドバイスをいただけますか。',
    status: 'escalated',
    analysis: {
      category: '税務質問',
      confidence: 0.48,
      urgency: 'low',
      requiresTaxJudgment: true,
      reason:
        '「役員報酬」「期中変更」は個別判断（業績悪化に伴う改定該当性）が必要。信頼度0.48で閾値未満。',
    },
  },
  {
    messageId: 'INQ-2026-0411',
    clientEmail: 'takahashi@geometrics.io',
    receivedAt: '2026-05-08T02:05:00Z',
    subject: '年末調整書類の受付期限',
    body: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。',
    status: 'sent',
    analysis: {
      category: '期日確認',
      confidence: 0.93,
      urgency: 'low',
      requiresTaxJudgment: false,
      reason: 'FAQ Q-007に直接マッチ。',
    },
  },
];

export const KNOWLEDGE = [
  {
    source: '事務所マニュアル §4.2',
    content: '法人税申告書 提出期限の運用ルール（3月決算は5月末）',
    meta: {
      title: '法人税申告書 提出期限の運用ルール',
      section: '§4.2',
      updated: '2025-12-04',
      uses: 142,
      status: 'fresh',
    },
  },
  {
    source: 'FAQ集 Q-018',
    content: '決算月別 申告期限カレンダー（3月決算）',
    meta: {
      title: '決算月別 申告期限カレンダー',
      section: 'Q-018',
      updated: '2026-01-20',
      uses: 88,
      status: 'fresh',
    },
  },
  {
    source: '顧問先マスタ C-0142',
    content: '山田商事 顧問契約 特記事項',
    meta: {
      title: '山田商事 顧問契約 特記事項',
      section: 'C-0142',
      updated: '2025-08-11',
      uses: 12,
      status: 'fresh',
    },
  },
  {
    source: '過去回答ログ 2025-11',
    content: '源泉徴収票 送付先運用（住所変更時）',
    meta: {
      title: '源泉徴収票 送付先運用',
      section: '2025-11',
      updated: '2025-11-02',
      uses: 47,
      status: 'fresh',
    },
  },
  {
    source: 'e-Tax 優先運用ガイド §6.1',
    content: '電子申告における必要書類一覧',
    meta: {
      title: '電子提出 優先運用ガイド',
      section: '§6.1',
      updated: '2025-09-30',
      uses: 64,
      status: 'review',
    },
  },
  {
    source: '業務マニュアル §11.4',
    content: '役員報酬 期中改定の例外要件',
    meta: {
      title: '役員報酬 期中改定の例外要件',
      section: '§11.4',
      updated: '2024-04-12',
      uses: 31,
      status: 'outdated',
    },
  },
  {
    source: '所内規程 §S-01',
    content: '税務調査 初動対応プロトコル',
    meta: {
      title: '税務調査 初動対応プロトコル',
      section: '§S-01',
      updated: '2025-06-20',
      uses: 8,
      status: 'fresh',
    },
  },
  {
    source: 'FAQ集 Q-007',
    content: '年末調整 受付期限と督促ルール',
    meta: {
      title: '年末調整 受付期限と督促ルール',
      section: 'Q-007',
      updated: '2025-11-25',
      uses: 96,
      status: 'fresh',
    },
  },
];
