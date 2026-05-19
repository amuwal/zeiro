'use client';

import { useEffect, useState } from 'react';
import { ConfidenceDial } from './confidence-dial';
import { useReveal } from './use-reveal';

type ConfidenceCase = { v: number; nm: string; desc: string; grade: string };

const CASES: ConfidenceCase[] = [
  {
    v: 0.94,
    nm: '3月決算 申告期限の確認',
    desc: 'FAQ Q-018 と事務所マニュアル §4.2 に完全一致。',
    grade: '0.94',
  },
  {
    v: 0.71,
    nm: '海外送金 源泉徴収判定',
    desc: '判定フローは存在するが、日米租税条約の適用可否は個別事情に依存。',
    grade: '0.71',
  },
  {
    v: 0.48,
    nm: '役員報酬 期中改定の損金算入',
    desc: '「業績悪化に伴う改定」該当性が個別判断。マニュアルが2024年4月で更新待ち。',
    grade: '0.48',
  },
];

const THRESHOLDS: Array<{ kind: 'auto' | 'review' | 'escalate'; grade: string; label: string; sub: string }> = [
  { kind: 'auto', grade: '≥ 0.85', label: '自動送信 — 担当のみ通知', sub: '高確度 · 定型応答' },
  { kind: 'review', grade: '0.70 – 0.85', label: '下書きを生成 · 担当者の承認後に送信', sub: '標準フロー' },
  { kind: 'escalate', grade: '< 0.70', label: '所長へ即時エスカレーション', sub: '個別判断・新規論点' },
];

export function ConfidenceSection() {
  const ref = useReveal();
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSelected((s) => (s + 1) % CASES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const cur = CASES[selected]!;
  return (
    <section className="section confidence" id="confidence">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">04</span>
            <span>迷ったら、所長へ。</span>
          </div>
          <h2 className="section-title">
            信頼度が閾値を割ったら、
            <br />
            <em>人間に</em>渡す。
          </h2>
          <p className="section-lede">
            類似ナレッジの一致度、過去類例の数、顧問契約の特記事項。これらを総合し <b>0–1 の信頼度</b> を算出。
            事務所が設定した閾値を下回ったとき、Zeiro は<b>勝手に送信しない</b>。所長に確認を仰ぎます。
          </p>
        </div>

        <div className="conf-stage">
          <div className="conf-dial-wrap">
            <ConfidenceDial value={cur.v} />
            <div className="conf-dial-info">
              <div>
                <div className="nm">CASE · live</div>
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
                <div className="badge">{t.kind}</div>
              </div>
            ))}
            <div className="conf-threshold-foot">
              <span>閾値は事務所ごとに調整可</span>
              <span>監査ログ完備</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
