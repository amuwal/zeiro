'use client';

import { useReveal } from './use-reveal';

type Turn = {
  kind: '' | 'agent' | 'draft';
  mark: string;
  who: string;
  role: string;
  time: string;
  body: React.ReactNode;
};

const TURNS: Turn[] = [
  {
    kind: '',
    mark: '客',
    who: '高橋 啓介',
    role: 'CFO · 株式会社ジオメトリクス',
    time: '5/8 11:05',
    body: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。',
  },
  {
    kind: 'agent',
    mark: '所',
    who: '佐藤 健一',
    role: '凜事務所 · AI下書きをそのまま送信',
    time: '5/8 11:18',
    body: '受付期限は申告書原本が 11月20日 必着、電子申告データは 11月25日 23:59 まで。期限3営業日前に自動リマインダーを送信します。詳細は FAQ Q-007 にも記載。',
  },
  {
    kind: '',
    mark: '客',
    who: '高橋 啓介',
    role: 'CFO · 株式会社ジオメトリクス',
    time: '5/8 14:32',
    body: 'ありがとうございます。電子申告データの送信先URLは昨年と同じでしょうか？念のため確認させてください。',
  },
  {
    kind: 'draft',
    mark: 'AI',
    who: 'AI Agent',
    role: '下書き · v1 · 0.74秒で生成',
    time: '5/8 14:33',
    body: (
      <>
        ご確認ありがとうございます。送信先URLは <em>昨年から変更ございません</em>
        。念のため、ログイン情報を再共有いたします — URL:
        https://tax.rin-jimusho.jp/upload、初回ログイン時は事務所発行の認証コードが必要です（別途お送り済み）。
      </>
    ),
  },
];

const FACTS: Array<{ body: React.ReactNode; src: string }> = [
  { body: <b>送信先 URL は昨年から変更なし</b>, src: 'kb-010 § 更新履歴' },
  { body: <b>本顧問先は IPO 準備中、質問が継続発生</b>, src: 'CL-008 · 顧問先マスタ note' },
  { body: <b>3時間前に同スレッドで FAQ Q-007 を引用済み</b>, src: '同スレッド · 重複引用を抑制' },
  { body: <b>認証コードは 4月12日に送付済み</b>, src: '送信履歴 · 別途送付済み' },
  { body: <b>担当: 佐藤 健一 / 文体は丁寧体・段落短め</b>, src: '担当ごとの文体プロファイル' },
];

export function MemorySection() {
  const ref = useReveal();
  return (
    <section className="section memory" id="memory">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">05</span>
            <span>会話の文脈を、覚えている。</span>
          </div>
          <h2 className="section-title">
            一往復で終わる質問は、
            <br />
            <em>そうそうない</em>。
          </h2>
          <p className="section-lede">
            「先週話していた e-Tax の件、もう一度送信先URLを教えて」— こうした<b>2往復目・3往復目の問い合わせ</b>でも、
            zeiro は前回までのやり取り、顧問契約、送付済み資料を踏まえた上で答えます。
          </p>
        </div>

        <div className="thread-stage">
          <div className="thread-rail">
            {TURNS.map((turn) => (
              <div className={`turn ${turn.kind}`} key={`${turn.who}-${turn.time}`}>
                <span className="mark">{turn.mark}</span>
                <div>
                  <div className="head">
                    <span className="who">{turn.who}</span>
                    <span className="role">{turn.role}</span>
                    <span className="time">{turn.time}</span>
                  </div>
                  <div className="body">{turn.body}</div>
                </div>
              </div>
            ))}
          </div>

          <aside className="memory-tape">
            <h4>このスレッドで参照中の記憶</h4>
            {FACTS.map((fact, i) => (
              <div className="memory-fact" key={i}>
                <span className="gl" />
                <div>
                  {fact.body}
                  <span className="src">{fact.src}</span>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
