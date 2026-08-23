import { ArrowIcon } from './arrow-icon';
import { HeroDemo } from './hero-demo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zeiro.io';

export function Hero() {
  return (
    <section className="hero container" id="top">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="badge">α</span>
            <span>EARLY ALPHA · 税理士事務所向け</span>
            <span className="pulse" />
          </div>

          <h1>
            <span className="line">
              <span>下書きは、</span>
            </span>
            <span className="line">
              <span>
                <em>AIと</em>。
              </span>
            </span>
            <span className="line">
              <span>
                送信は<span className="ink-light">人が</span>。
              </span>
            </span>
          </h1>

          <p className="hero-sub">
            メール・LINE・Chatwork・Webフォームに届く問い合わせに、
            <b>事務所のマニュアル・FAQ・顧問先情報・過去回答</b>
            を参照した返信案を作成。
            <br />
            引用と信頼度を確認し、最後は必ず担当者が承認して送信します。
          </p>

          <div className="hero-cta-row">
            <a className="btn btn-solid btn-lg" href="#cta">
              サンプルでデモを見る
              <span className="arrow">
                <ArrowIcon size={14} />
              </span>
            </a>
            <a className="btn btn-line btn-lg" href={APP_URL}>
              α版を開く
            </a>
          </div>

          <div className="hero-microstats">
            <div className="hero-microstat">
              <div className="v">HITL</div>
              <div className="l">全件レビュー</div>
            </div>
            <div className="hero-microstat">
              <div className="v">MASK</div>
              <div className="l">本文・添付テキスト</div>
            </div>
            <div className="hero-microstat">
              <div className="v">LOG</div>
              <div className="l">送信・却下を記録</div>
            </div>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}
