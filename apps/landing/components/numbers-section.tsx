'use client';

import { useReveal } from './use-reveal';

type Cell = { label: string; value: string; unit: string; note: React.ReactNode };

const CELLS: Cell[] = [
  {
    label: '— 自動回答率',
    value: '73',
    unit: '%',
    note: (
      <>
        問い合わせ全件のうち、<b>下書きを微修正なしで送信</b>
        できた割合。残りは担当者が編集または所長へ。
      </>
    ),
  },
  {
    label: '— 平均初回返答',
    value: '22',
    unit: 'min',
    note: (
      <>
        受信から最初の返信送信までの中央値。導入前は <b>4時間18分</b>。
      </>
    ),
  },
  {
    label: '— 担当の処理量',
    value: '3.4',
    unit: '×',
    note: (
      <>
        担当者ひとりが1日に捌けた件数の伸び。所長は監督に集中、新規開拓・申告期対応に時間を回せる。
      </>
    ),
  },
  {
    label: '— 引用付き',
    value: '100',
    unit: '%',
    note: (
      <>
        送信された下書きのうち、<b>事務所内の出典が明示されている</b>
        割合。監査・教育・属人化解消に直結。
      </>
    ),
  },
];

export function NumbersSection() {
  const ref = useReveal();
  return (
    <section className="section numbers" id="numbers">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">06</span>
            <span>実績で語る。</span>
          </div>
          <h2 className="section-title">
            <em>4ヶ月で</em> 事務所の生産性が
            <br />
            倍以上に。
          </h2>
          <p className="section-lede">
            関東 / 関西の 9つのパイロット事務所での導入結果。所員数 4–32名、顧問先数
            60–410社のレンジ。
          </p>
        </div>

        <div className="numbers-grid">
          {CELLS.map((c) => (
            <div className="num-cell" key={c.label}>
              <span className="lbl">{c.label}</span>
              <div className="v">
                {c.value}
                <span className="unit">{c.unit}</span>
              </div>
              <p className="note">{c.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
