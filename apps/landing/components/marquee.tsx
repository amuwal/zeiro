const ITEMS = [
  'メール · Resend',
  'LINE 公式アカウント',
  'Chatwork',
  'Webフォーム',
  '事務所マニュアル',
  'FAQ',
  '顧問先情報',
  '過去回答',
  'freee · 読取専用',
  '本文・添付テキストの番号マスク',
  '人によるレビュー',
  '監査ログ',
];

export function Marquee() {
  const loop = [
    ...ITEMS.map((label) => ({ id: `first-${label}`, label })),
    ...ITEMS.map((label) => ({ id: `second-${label}`, label })),
  ];
  return (
    <div className="marquee">
      <div className="marquee-label">α版の対象</div>
      <div className="marquee-track">
        {loop.map((item) => (
          <span className="marquee-item" key={item.id}>
            {item.label}
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
