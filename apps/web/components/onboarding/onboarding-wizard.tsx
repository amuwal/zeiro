'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';
import {
  completeOnboardingAction,
  type FirmProfileState,
  saveFirmProfileAction,
} from '@/app/onboarding/actions';
import { CopyButton } from '@/components/onboarding/copy-button';
import { sendTestInquiryAction } from '@/components/onboarding/test-inquiry-action';
import { Icon, type IconName } from '@/components/ui/icon';

const STEPS = ['事務所プロフィール', '受信トレイ', '準備完了'];
const initial: FirmProfileState = { ok: false, error: null };

type Props = { firmName: string; signature: string; inboundAddress: string };

export function OnboardingWizard({ firmName, signature, inboundAddress }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, action, saving] = useActionState(saveFirmProfileAction, initial);
  const [leaving, startLeave] = useTransition();

  // Advance the moment the profile saves.
  useEffect(() => {
    if (state.ok) setStep((s) => (s === 0 ? 1 : s));
  }, [state.ok]);

  function finish(go: string, test?: boolean) {
    startLeave(async () => {
      await completeOnboardingAction().catch(() => {});
      if (test) {
        const { inquiryId } = await sendTestInquiryAction();
        router.push(`/inbox/${inquiryId}`);
      } else {
        router.push(go);
      }
    });
  }

  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg anim-stagger">
      <div className="px-9 pt-8">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={`h-1 rounded-full transition-[background-color,opacity] duration-500 ease-out ${
                  i <= step ? 'bg-accent' : 'bg-line'
                }`}
              />
              <span
                className={`text-[11px] transition-colors duration-300 ${
                  i === step ? 'font-medium text-accent-ink' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div key={step} className="wiz-step px-9 pb-9 pt-7">
        {step === 0 && (
          <Step
            icon="spark"
            title="Zeiro へようこそ"
            sub="まず、顧問先に表示される事務所情報を設定します。ここで入力した名称が返信の差出人・署名に使われます。"
          >
            <form action={action} className="flex flex-col gap-4">
              <Field label="事務所名" hint="例: さくら税理士事務所">
                <input
                  name="name"
                  defaultValue={firmName}
                  required
                  autoFocus
                  className="w-full rounded-md border border-line bg-bg-2 px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-accent"
                  placeholder="さくら税理士事務所"
                />
              </Field>
              <Field label="担当者署名" hint="任意 — 返信の結びに使います">
                <input
                  name="signature"
                  defaultValue={signature}
                  className="w-full rounded-md border border-line bg-bg-2 px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-accent"
                  placeholder="例: 税理士 佐藤 太郎"
                />
              </Field>
              {state.error && <p className="text-[12px] text-urgent">{state.error}</p>}
              <button type="submit" disabled={saving} className="btn btn-primary mt-1 w-fit">
                {saving ? '保存中…' : '保存して次へ'} <Icon name="arrow-right" size={14} />
              </button>
            </form>
          </Step>
        )}

        {step === 1 && (
          <Step
            icon="inbox"
            title="受信トレイをつなぐ"
            sub="顧問先のメールをこの専用アドレスへ自動転送すると、AI が下書きを作成します。顧問先はこれまで通り事務所のアドレスに送るだけです。"
          >
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-bg-2 px-4 py-3">
              <code className="truncate font-mono text-[13px] text-ink-2">{inboundAddress}</code>
              <CopyButton text={inboundAddress} />
            </div>
            <p className="mt-3 text-[12px] text-muted">
              Gmail / Outlook の自動転送の手順は、設定 → メール受信 で確認できます。
            </p>
            <div className="mt-6 flex items-center gap-3">
              <BackButton onClick={() => setStep(0)} />
              <button type="button" onClick={() => setStep(2)} className="btn btn-primary">
                次へ <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            icon="check"
            title="準備完了です"
            sub="サンプルの問い合わせを送って、AI の下書きがその場で作られる様子を確認しましょう。"
          >
            <button
              type="button"
              disabled={leaving}
              onClick={() => finish('/home', true)}
              className="btn btn-primary w-full justify-center py-3"
            >
              <Icon name="spark" size={15} />
              {leaving ? 'AI が下書き中…' : 'テスト問い合わせを送って試す'}
            </button>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <NextCard href="/clients/import" icon="upload" label="顧問先を取り込む" />
              <NextCard href="/knowledge/new" icon="book" label="ナレッジを追加" />
              <NextCard href="/settings" icon="settings" label="freee を連携" />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <BackButton onClick={() => setStep(1)} />
              <button
                type="button"
                disabled={leaving}
                onClick={() => finish('/home')}
                className="text-[13px] font-medium text-accent transition hover:underline disabled:opacity-60"
              >
                ダッシュボードへ進む →
              </button>
            </div>
          </Step>
        )}
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  sub,
  children,
}: {
  icon: IconName;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-accent-soft text-accent">
          <Icon name={icon} size={18} />
        </span>
        <h1 className="mt-4 font-sans text-[20px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[11px] text-muted">{hint}</span>
      </span>
      {children}
    </label>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[13px] text-muted transition-colors hover:text-ink"
    >
      戻る
    </button>
  );
}

function NextCard({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md border border-line bg-bg-2 px-3 py-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
    >
      <Icon name={icon} size={14} />
      {label}
    </Link>
  );
}
