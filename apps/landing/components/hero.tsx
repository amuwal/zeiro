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
            <span>税理士事務所のための</span>
            <span className="pulse" />
          </div>

          <h1>
            <span className="line">
              <span>顧客対応を、</span>
            </span>
            <span className="line">
              <span>
                <em>自動で</em>。
              </span>
            </span>
            <span className="line">
              <span>
                所長は<span className="ink-light">監督に</span>。
              </span>
            </span>
          </h1>

          <p className="hero-sub">
            メール・LINE・Webフォームに届く問い合わせを、
            <b>事務所のマニュアル・FAQ・顧問先情報・過去回答</b>
            で自動下書き。
            <br />
            引用付き。信頼度判定付き。低信頼の案件は所長へ自動エスカレーション。
          </p>

          <div className="hero-cta-row">
            <a className="btn btn-solid btn-lg" href="#cta">
              事務所を接続する
              <span className="arrow">
                <ArrowIcon size={14} />
              </span>
            </a>
            <a className="btn btn-line btn-lg" href={APP_URL}>
              プロダクトを試す
              <span className="kbd" style={{ color: 'var(--ink-3)', borderColor: 'var(--line)' }}>
                D
              </span>
            </a>
          </div>

          <div className="hero-microstats">
            <div className="hero-microstat">
              <div className="v">
                73<span className="unit">%</span>
              </div>
              <div className="l">自動回答率</div>
            </div>
            <div className="hero-microstat">
              <div className="v">
                22<span className="unit">min</span>
              </div>
              <div className="l">平均初回返答</div>
            </div>
            <div className="hero-microstat">
              <div className="v">
                100<span className="unit">%</span>
              </div>
              <div className="l">引用付き下書き</div>
            </div>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}
