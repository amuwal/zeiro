import type { EmailCardData } from './EmailCard';

export const SAMPLE_EMAILS: EmailCardData[] = [
  {
    from: '田中商事 田中様',
    subject: '源泉徴収票の再発行のお願い',
    preview: 'お世話になっております。先日いただいた…',
    kind: 'docs',
  },
  {
    from: '佐藤工業 佐藤様',
    subject: '消費税申告書ドラフトの確認',
    preview: '添付の数値を確認いただけますでしょうか',
    kind: 'tax',
  },
  {
    from: '山本商店 山本様',
    subject: '11月末締めの月次決算',
    preview: '来週中にいただけると助かります',
    kind: 'deadline',
  },
  {
    from: '西村法律事務所',
    subject: '顧問契約更新の件',
    preview: '条件面についてご相談させてください',
    kind: 'contract',
  },
  {
    from: '鈴木製作所 鈴木様',
    subject: '領収書のスキャン納品',
    preview: '10月分、PDFにて送付いたします',
    kind: 'docs',
  },
  {
    from: '高橋会計 高橋様',
    subject: '年末調整 配偶者控除の判定',
    preview: '扶養範囲についてご教示ください',
    kind: 'tax',
  },
  {
    from: '中村運送',
    subject: '請求書フォーマットの相談',
    preview: 'インボイス対応の件で…',
    kind: 'contract',
  },
  {
    from: '国税庁 e-Tax',
    subject: '申告期限のリマインド',
    preview: '12月10日が提出期限となっています',
    kind: 'deadline',
  },
  {
    from: '藤田事務所',
    subject: '電子帳簿保存法 対応の質問',
    preview: 'クラウド会計の連携について',
    kind: 'other',
  },
  { from: '井上商会', subject: '経費精算の追加分', preview: '出張交通費 ¥48,200', kind: 'docs' },
  {
    from: '森田税務署',
    subject: '実地調査の日程調整',
    preview: '12月18日午前を希望します',
    kind: 'deadline',
  },
  {
    from: '渡辺コンサル',
    subject: '事業承継のスキーム相談',
    preview: '親族外承継を検討中とのこと',
    kind: 'tax',
  },
];

export const ZEIRO_REPLY_LINES = [
  '田中様',
  '',
  'お世話になっております。Zeiro 経由でご返信申し上げます。',
  'ご依頼いただきました源泉徴収票につきまして、',
  '本日中に PDF にてお送りいたします。',
  '',
  'なお、再発行の根拠資料として、',
  '令和 5 年分の給与支払報告書を参照しております。',
  '',
  'ご不明点がございましたらお知らせください。',
];

export const CITED_SOURCES = [
  { id: 'S-08', label: '顧問契約書 §4.2', color: 'oklch(48% 0.06 195)' },
  { id: 'K-21', label: '国税庁 質疑応答 No.4117', color: 'oklch(52% 0.1 25)' },
  { id: 'C-12', label: '田中様 過去メール 2024-09-18', color: 'oklch(45% 0.08 295)' },
];
