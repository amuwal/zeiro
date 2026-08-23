'use client';

import { useReveal } from './use-reveal';

type Cell = { label: string; value: string; unit: string; note: React.ReactNode };

const CELLS: Cell[] = [
  {
    label: '— 送信前レビュー',
    value: '必須',
    unit: '',
    note: (
      <>
        信頼度が高い返信案でも自動送信せず、<b>担当者が内容と出典を確認</b>してから送信します。
      </>
    ),
  },
  {
    label: '— 12桁番号パターン',
    value: 'MASK',
    unit: '',
    note: (
      <>
        問い合わせ本文と解析した添付テキスト内の12桁番号パターンを<b>マスキング</b>します。
        件名は現在の対象外です。
      </>
    ),
  },
  {
    label: '— アクセス範囲',
    value: '限定',
    unit: '',
    note: (
      <>
        問い合わせとナレッジへのアクセスを<b>事務所（テナント）単位</b>で絞ります。
      </>
    ),
  },
  {
    label: '— 監査証跡',
    value: '記録',
    unit: '',
    note: (
      <>
        送信・却下の操作を、<b>担当者と時刻</b>とともに監査ログへ記録します。
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
            <span>α版の現在地。</span>
          </div>
          <h2 className="section-title">
            実績を装わず、
            <br />
            <em>安全性から</em>検証する。
          </h2>
          <p className="section-lede">
            Zeiro は初期 α 版です。公開できる顧客導入実績や効果指標はまだありません。
            まずはサンプルまたは匿名化したデータで動作を確認し、実際のフィードバックをもとに改善します。
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
