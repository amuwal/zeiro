'use client';

import { type FormEvent, useState } from 'react';
import { useReveal } from './use-reveal';

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? '04001fb4-ed55-42b2-9bac-62db71455466';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export function CtaSection() {
  const ref = useReveal();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');

    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Zeiro サンプルデモのリクエスト — ${email}`,
          from_name: 'Zeiro landing',
          email,
          message: `サンプルデモのリクエスト\n\nメールアドレス: ${email}\n所要: 15分・無料\n実データの提出: 不要`,
          botcheck: '',
        }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (res.ok && data.success) {
        setStatus('sent');
        setEmail('');
        setTimeout(() => setStatus('idle'), 6000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const buttonLabel =
    status === 'sent'
      ? '送信しました ✓'
      : status === 'submitting'
        ? '送信中…'
        : status === 'error'
          ? '再送信'
          : 'デモをリクエスト';

  return (
    <section className="cta" id="cta">
      <div className="container">
        <div ref={ref} className="reveal">
          <div className="cta-block">
            <div className="cta-inner">
              <div>
                <h2 className="cta-title">
                  <em>サンプルで、</em>
                  <br />
                  α版を見ませんか。
                </h2>
                <p className="cta-sub">
                  こちらで用意した架空の問い合わせとナレッジで、15分ほどの短いデモをご案内します。
                  <b>事務所マニュアルや実際の顧客データは不要</b>です。
                </p>
              </div>

              <form className="cta-form" onSubmit={submit}>
                <div className="label">
                  <span>サンプルデモ</span>
                  <span>所要 15分 · 無料</span>
                </div>
                <div className="input">
                  <input
                    type="email"
                    name="email"
                    placeholder="office@example.co.jp"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === 'submitting'}
                    autoComplete="email"
                  />
                  <button
                    type="submit"
                    className="btn btn-solid"
                    disabled={status === 'submitting' || status === 'sent'}
                  >
                    {buttonLabel}
                  </button>
                </div>
                {status === 'error' ? (
                  <div className="cta-error" role="alert">
                    送信に失敗しました。時間をおいて再度お試しください。
                  </div>
                ) : null}
                <div className="cta-bullets">
                  <span className="b">機密資料は不要</span>
                  <span className="b">架空データで体験</span>
                  <span className="b">α版フィードバック募集</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
