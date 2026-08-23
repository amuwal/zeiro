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
    role: 'CFO · サンプル株式会社',
    time: '5/8 11:05',
    body: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。',
  },
  {
    kind: 'agent',
    mark: '所',
    who: '担当者（例）',
    role: 'AI下書きを確認・編集して送信',
    time: '5/8 11:18',
    body: '受付期限は申告書原本が 11月20日 必着、電子申告データは 11月25日 23:59 まで。期限3営業日前にお知らせする運用です。詳細は FAQ Q-007 にも記載しています。',
  },
  {
    kind: '',
    mark: '客',
    who: '高橋 啓介',
    role: 'CFO · サンプル株式会社',
    time: '5/8 14:32',
    body: 'ありがとうございます。電子申告データの送信先URLは昨年と同じでしょうか？念のため確認させてください。',
  },
  {
    kind: 'draft',
    mark: 'AI',
    who: 'AI Agent',
    role: '下書き · DEMO · 送信前レビュー待ち',
    time: '5/8 14:33',
    body: (
      <>
        ご確認ありがとうございます。送信先URLは <em>昨年から変更ございません</em>
        。念のため、ログイン情報を再共有いたします — URL:
        https://example.com/upload、初回ログイン時は事務所発行の認証コードが必要です（別途お送り済み）。
      </>
    ),
  },
];

const FACTS: Array<{ body: React.ReactNode; src: string }> = [
  { body: <b>送信先 URL は昨年から変更なし</b>, src: 'メールスレッド · 送信先案内' },
  { body: <b>本顧問先は IPO 準備中、質問が継続発生</b>, src: 'CL-008 · 顧問先マスタ note' },
  {
    body: <b>3時間前に同じメールスレッドで FAQ Q-007 を案内済み</b>,
    src: 'メールスレッド · FAQ案内',
  },
  { body: <b>認証コードは 4月12日に案内済み</b>, src: 'メールスレッド · 認証コード案内' },
];

export function MemorySection() {
  const ref = useReveal();
  return (
    <section className="section memory" id="memory">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="section-eyebrow">
            <span className="num">05</span>
            <span>サンプル会話で見る、メール文脈。</span>
          </div>
          <h2 className="section-title">
            一往復で終わる質問は、
            <br />
            <em>そうそうない</em>。
          </h2>
          <p className="section-lede">
            「先週話していた e-Tax の件、もう一度送信先URLを教えて」— こうした
            <b>2往復目・3往復目の問い合わせ</b>では、同じメールスレッドのやり取りや顧問先情報を
            次の下書きの材料にします。表示内容はすべて架空で、最終的な回答は人が確認します。
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
            <h4>DEMO · このスレッドで参照中の情報</h4>
            {FACTS.map((fact) => (
              <div className="memory-fact" key={fact.src}>
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
