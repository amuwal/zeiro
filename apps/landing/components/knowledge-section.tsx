'use client';

import { KnowledgeVault } from './knowledge-vault';
import { useReveal } from './use-reveal';

const SOURCES: Array<{ nm: string; n: string }> = [
  { nm: '事務所マニュアル', n: '参照' },
  { nm: 'FAQ / Q&A', n: '参照' },
  { nm: '顧問先情報', n: '参照' },
  { nm: '過去回答', n: '参照' },
  { nm: 'freee 会計データ', n: '読取専用' },
];

export function KnowledgeSection() {
  const ref = useReveal();
  return (
    <section className="section knowledge" id="knowledge">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">02</span>
            <span>必要な知識だけを、根拠に。</span>
          </div>
          <h2 className="section-title">
            "<em>事務所の知識</em>" を、
            <br />
            レビューできる下書きへ。
          </h2>
          <p className="section-lede">
            汎用 LLM は、貴所の<b>運用ルールも、顧問先の特記事項も知りません</b>。Zeiro
            は登録されたマニュアル、FAQ、顧問先情報、過去回答を検索し、返信案と一緒に
            <b>参照した情報</b>を提示します。
          </p>
        </div>

        <div className="kn-stage">
          <div className="kn-stat">
            <div className="lbl">α版で扱う主な参照元</div>
            <div className="big">
              5<span className="unit">種類</span>
            </div>
            <p className="blurb">
              各事務所が登録した情報をテナントの範囲内で検索し、下書きの参照元として表示します。
              freee 連携は <b>読取専用</b> です。
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
