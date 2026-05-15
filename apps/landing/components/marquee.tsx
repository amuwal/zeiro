const ITEMS = [
  'メール (IMAP)',
  'Gmail',
  'Microsoft 365',
  'LINE 公式アカウント',
  'Chatwork',
  'Slack Connect',
  'Webフォーム',
  'SMS',
  '電話 文字起こし',
  '国税庁 通達',
  'TKC FX',
  'freee',
  '弥生',
  'MFクラウド',
];

export function Marquee() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee">
      <div className="marquee-label">取り込み元</div>
      <div className="marquee-track">
        {loop.map((s, i) => (
          <span className="marquee-item" key={`${s}-${i}`}>
            {s}
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
