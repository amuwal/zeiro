'use client';

import { ChannelConstellation } from './channel-constellation';
import { useReveal } from './use-reveal';

const BULLETS: Array<{ tag: string; title: string; body: React.ReactNode }> = [
  {
    tag: '— A',
    title: '顧問先単位で整理',
    body: (
      <>
        送信元と登録済みの顧問先情報を照合し、<code>INQ-SAMPLE-0418</code> のような問い合わせとして
        顧問先とチャネルが分かる形に整理します。
      </>
    ),
  },
  {
    tag: '— B',
    title: 'カテゴリ自動分類',
    body: <>「期日確認」「書類提出」「税務質問」「顧問契約」「その他」の5カテゴリに整理します。</>,
  },
  {
    tag: '— C',
    title: 'α版で扱う範囲を明確に',
    body: (
      <>
        対象はメール（Resend経由）、LINE、Chatwork、Webフォーム。freee
        は会計データの参照のみで、書き込みません。
      </>
    ),
  },
];

export function ChannelsSection() {
  const ref = useReveal();
  return (
    <section className="section channels" id="channels">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">01</span>
            <span>受信を、ひとつに。</span>
          </div>
          <h2 className="section-title">
            メール、LINE、フォーム。
            <br />
            <em>すべての連絡を</em>ひとつの受信トレイへ。
          </h2>
          <p className="section-lede">
            α版が扱うのは <b>メール・LINE・Chatwork・Webフォーム</b> の4チャネル。届いた内容を
            ひとつの受信トレイで整理し、担当者が同じ画面で確認できるようにします。
          </p>
        </div>

        <div className="channels-stage">
          <ChannelConstellation />

          <div className="channels-bullets">
            {BULLETS.map((bullet) => (
              <div className="bullet" key={bullet.title}>
                <span className="num">{bullet.tag}</span>
                <div>
                  <h3>{bullet.title}</h3>
                  <p>{bullet.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
