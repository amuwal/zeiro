'use client';

import { ChannelConstellation } from './channel-constellation';
import { useReveal } from './use-reveal';

const BULLETS: Array<{ tag: string; title: string; body: React.ReactNode }> = [
  {
    tag: '— A',
    title: '顧問先で自動名寄せ',
    body: (
      <>
        メールアドレス、電話番号、LINE ID、過去履歴を突合。3チャネルから同じ案件として届いても{' '}
        <code>INQ-2026-0418</code> の1スレッドにまとまります。
      </>
    ),
  },
  {
    tag: '— B',
    title: 'カテゴリ自動分類',
    body: (
      <>「期日確認」「書類提出」「税務質問」「顧問契約」「その他」。事務所内の運用ルールで閾値を調整可能。</>
    ),
  },
  {
    tag: '— C',
    title: '送信元のプロトコルは問わない',
    body: <>添付PDF、画像、LINEスタンプ、フォームの構造化フィールド、すべて統一フォーマットでスレッドに格納。</>,
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
            顧問先からの問い合わせは、毎日 <b>5つ以上のチャネル</b>{' '}
            に散らばっている。zeiro はそれらを取り込み、 同じ顧問先・同じ案件として<b>自動で名寄せ</b>します。担当者は、もうタブを切り替えなくていい。
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
