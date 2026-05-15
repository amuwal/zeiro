'use client';

import { KnowledgeVault } from './knowledge-vault';
import { useReveal } from './use-reveal';

const SOURCES: Array<{ nm: string; n: string }> = [
  { nm: '事務所マニュアル', n: '1,284' },
  { nm: 'FAQ 集 / Q&A', n: '3,452' },
  { nm: '顧問先マスタ', n: '  186' },
  { nm: '過去回答ログ', n: '5,827' },
  { nm: '国税庁 通達・タックスアンサー', n: ' 約12k' },
  { nm: '判例 / 質疑応答事例', n: '  743' },
  { nm: 'TKC・freee 仕訳データ', n: ' 連動' },
  { nm: '所内Slack 既往スレッド', n: '  912' },
];

export function KnowledgeSection() {
  const ref = useReveal();
  return (
    <section className="section knowledge" id="knowledge">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">02</span>
            <span>事務所のすべてを、AIに渡す。</span>
          </div>
          <h2 className="section-title">
            "<em>事務所の頭の中</em>" を、
            <br />
            そのまま下書きの根拠に。
          </h2>
          <p className="section-lede">
            汎用 LLM は、貴所の<b>運用ルールも、顧問先の特記事項も知りません</b>。zeiro は事務所マニュアル、FAQ、
            過去回答、顧問先マスタ、国税庁通達まで取り込み、答えるたびに必ず<b>どこから来た答えか</b>を示します。
          </p>
        </div>

        <div className="kn-stage">
          <div className="kn-stat">
            <div className="lbl">事務所から学習したナレッジ</div>
            <div className="big">
              10,847<span className="plus">+</span>
              <span className="unit">件</span>
            </div>
            <p className="blurb">
              既存の事務所マニュアル PDF、Notion、Google Drive、Slack 既往スレッドから自動でインデックス。
              新しいルールを書き加えれば <b>15分以内</b> に下書きに反映されます。
            </p>

            <div className="kn-sources">
              {SOURCES.map((s) => (
                <div key={s.nm} className="kn-source-row">
                  <span className="dot" />
                  <span className="nm">{s.nm}</span>
                  <span className="n">{s.n}</span>
                </div>
              ))}
            </div>
          </div>

          <KnowledgeVault />
        </div>
      </div>
    </section>
  );
}
