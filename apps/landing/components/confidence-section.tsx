'use client';

import { useEffect, useState } from 'react';
import { ConfidenceDial } from './confidence-dial';
import { useReveal } from './use-reveal';

type ConfidenceCase = { v: number; nm: string; desc: string; grade: string };

const CASES = [
  {
    v: 0.85,
    nm: '3月決算 申告期限の確認',
    desc: '参照元を3件提示。内容と出典を確認してから送信します。',
    grade: '0.85',
  },
  {
    v: 0.7,
    nm: '海外送金 源泉徴収判定',
    desc: '参照元は2件。個別事情の確認が必要なため、人への引き継ぎを検討します。',
    grade: '0.70',
  },
  {
    v: 0.3,
    nm: '役員報酬 期中改定の損金算入',
    desc: '参照元なし。憶測で下書きを作らず、人へ引き継ぐ候補です。',
    grade: '0.30',
  },
] satisfies readonly [ConfidenceCase, ...ConfidenceCase[]];

const THRESHOLDS: Array<{
  kind: 'auto' | 'review' | 'escalate';
  grade: string;
  label: string;
  sub: string;
  badge: string;
}> = [
  {
    kind: 'auto',
    grade: '0.85',
    label: '参照元を3件以上提示',
    sub: '送信前レビューは必須',
    badge: 'review',
  },
  {
    kind: 'review',
    grade: '0.55–0.70',
    label: '参照元を1〜2件提示',
    sub: '元資料と個別事情を確認',
    badge: 'review',
  },
  {
    kind: 'escalate',
    grade: '0.30',
    label: '根拠不足 — 人への引き継ぎ候補',
    sub: '参照元なし',
    badge: 'escalate',
  },
];

export function ConfidenceSection() {
  const ref = useReveal();
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSelected((s) => (s + 1) % CASES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const cur = CASES[selected] ?? CASES[0];
  return (
    <section className="section confidence" id="confidence">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">04</span>
            <span>根拠が弱ければ、人へ。</span>
          </div>
          <h2 className="section-title">
            信頼度は、
            <br />
            <em>引用件数から</em>出すレビュー目安。
          </h2>
          <p className="section-lede">
            α版の信頼度は、返信案に付いた<b>引用の件数</b>から算出する確認用の目安です。
            正しさや送信可否を決めるものではありません。税務判断や根拠不足の案件は、スコアとは別に
            人への引き継ぎ候補となり、<b>すべての返信案を人が確認</b>します。
          </p>
        </div>

        <div className="conf-stage">
          <div className="conf-dial-wrap">
            <ConfidenceDial value={cur.v} />
            <div className="conf-dial-info">
              <div>
                <div className="nm">CASE · DEMO DATA</div>
                <div className="v">{cur.nm}</div>
              </div>
              <div className="s">{cur.desc}</div>
              <div className="picker">
                {CASES.map((c, i) => (
                  <button
                    type="button"
                    key={c.nm}
                    onClick={() => setSelected(i)}
                    className={i === selected ? 'active' : ''}
                  >
                    case {i + 1} · {c.grade}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="conf-threshold">
            {THRESHOLDS.map((t) => (
              <div className={`conf-row ${t.kind}`} key={t.kind}>
                <div className="grade">{t.grade}</div>
                <div className="label">
                  {t.label}
                  <span className="sub">{t.sub}</span>
                </div>
                <div className="badge">{t.badge}</div>
              </div>
            ))}
            <div className="conf-threshold-foot">
              <span>α版の算出ルール</span>
              <span>すべて人が確認</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
