'use client';

import { useState } from 'react';
import { useReveal } from './use-reveal';

type Citation = {
  id: number;
  title: string;
  src: string;
  section: string;
  score: number;
  snippet: string;
};

const CITATIONS: Citation[] = [
  {
    id: 1,
    title: '法人税申告書 提出期限の運用ルール',
    src: '事務所マニュアル',
    section: '§ 4.2',
    score: 0.94,
    snippet:
      '3月決算法人の場合、提出期限は決算日から2ヶ月以内（5月31日）。当該日が休日の場合は翌営業日まで延長される。地方法人税・住民税・事業税も同日が原則期限。',
  },
  {
    id: 2,
    title: 'e-Tax 電子提出 優先運用ガイド',
    src: '事務所マニュアル',
    section: '§ 6.1',
    score: 0.88,
    snippet:
      '原則として全ての法人申告は e-Tax にて電子提出する。事前準備として、決算書（PL/BS/SS）、勘定科目内訳明細書、事業概況説明書の3点を顧問先より受領のこと。',
  },
  {
    id: 3,
    title: 'サンプル株式会社 顧問契約 特記事項',
    src: '顧問先マスタ',
    section: 'C-0142',
    score: 0.81,
    snippet:
      '貴社との顧問契約には「申告書ドラフトの事前確認」プロセスが含まれる。提出予定日の10日前（5月20日頃）に、確認用ドラフトを送付するルール。',
  },
];

export function CitationsSection() {
  const ref = useReveal();
  const [active, setActive] = useState(1);
  return (
    <section className="section cites" id="citations">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">03</span>
            <span>根拠と一緒に、レビュー。</span>
          </div>
          <h2 className="section-title">
            生成文を、
            <br />
            <em>出典まで</em>たどって確認。
          </h2>
          <p className="section-lede">
            下書きには、参照した<b>事務所内の情報</b>を表示します。担当者がマニュアル、FAQ、
            顧問先情報などの元資料と照合できます。引用は正しさの保証ではないため、
            <b>送信前の人による確認が必須</b>です。
          </p>
        </div>

        <div className="cite-stage">
          <div className="cite-paper">
            <div className="cite-paper-head">
              <span className="ctag">DEMO</span>
              <span>架空データ · To: 山田 正彦様 · サンプル株式会社</span>
            </div>

            <p>
              <b>山田 正彦様</b>、いつもお世話になっております。
            </p>
            <p>
              ご照会いただきました法人税の申告・納付期限につきまして、
              <b>貴社は3月決算ですので、提出期限は 2026年5月31日（日）</b>、 翌営業日
              6月1日までとなります。
              <button
                type="button"
                aria-label="出典1を表示"
                className={`cite-mark ${active === 1 ? 'active' : ''}`}
                onMouseEnter={() => setActive(1)}
                onFocus={() => setActive(1)}
                onClick={() => setActive(1)}
              >
                ¹
              </button>
            </p>
            <p>
              e-Tax電子提出をご希望とのこと、承知いたしました。当事務所では原則すべての法人申告を
              e-Tax にて行っております。 貴社からご準備いただく書類は{' '}
              <b>決算書 / 勘定科目内訳明細書 / 事業概況説明書</b> の3点です。
              <button
                type="button"
                aria-label="出典2を表示"
                className={`cite-mark ${active === 2 ? 'active' : ''}`}
                onMouseEnter={() => setActive(2)}
                onFocus={() => setActive(2)}
                onClick={() => setActive(2)}
              >
                ²
              </button>
            </p>
            <p>
              貴社の顧問契約には「申告書ドラフトの事前確認」プロセスが含まれておりますので、5月20日頃に弊所より確認用のドラフトをお送りいたします。
              <button
                type="button"
                aria-label="出典3を表示"
                className={`cite-mark ${active === 3 ? 'active' : ''}`}
                onMouseEnter={() => setActive(3)}
                onFocus={() => setActive(3)}
                onClick={() => setActive(3)}
              >
                ³
              </button>
            </p>
          </div>

          <div className="cite-cards">
            {CITATIONS.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cite-card text-left font-[inherit] ${active === c.id ? 'active' : ''}`}
                onMouseEnter={() => setActive(c.id)}
                onFocus={() => setActive(c.id)}
                onClick={() => setActive(c.id)}
              >
                <div className="cite-card-head">
                  <span className="n">{c.id}</span>
                  <span className="title">{c.title}</span>
                  <span className="score">{c.score.toFixed(2)}</span>
                </div>
                <div className="meta">
                  <b>{c.src}</b>
                  <span className="sep">·</span>
                  <span>{c.section}</span>
                  <span className="sep">·</span>
                  <span>類似度 {Math.round(c.score * 100)}%</span>
                </div>
                <p className="snippet">{c.snippet}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
