'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useState, useTransition } from 'react';
import { completeOnboardingAction, saveFirmProfileAction } from '@/app/onboarding/actions';
import { OnboardingPreview } from '@/components/onboarding/onboarding-preview';
import { DoneStep, InboxStep, ProfileStep } from '@/components/onboarding/onboarding-steps';
import { Logo } from '@/components/ui/logo';

const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;

const stepV = {
  enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 24 : -24 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { ...SPRING, staggerChildren: 0.05, delayChildren: 0.04 },
  },
  exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -24 : 24, transition: { duration: 0.16 } }),
};

type Props = { firmName: string; signature: string; inboundAddress: string };

export function OnboardingWizard({
  firmName: initialName,
  signature: initialSig,
  inboundAddress,
}: Props) {
  const router = useRouter();
  const [[step, dir], setStep] = useState<[number, number]>([0, 0]);
  const [firmName, setFirmName] = useState(initialName);
  const [signature, setSignature] = useState(initialSig);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [leaving, startLeave] = useTransition();
  const previewName = useDeferredValue(firmName);
  const previewSig = useDeferredValue(signature);

  const go = (next: number) => setStep([next, next >= step ? 1 : -1]);
  // Advance imperatively on a successful save. The previous useActionState +
  // effect approach skipped the 2nd save (ok stayed true → effect dep unchanged);
  // calling the action directly and advancing here always works.
  const handleSave = (formData: FormData) => {
    startSave(async () => {
      try {
        const res = await saveFirmProfileAction(formData);
        if (res.ok) {
          setError(null);
          setStep([1, 1]);
        } else {
          setError(res.error);
        }
      } catch {
        setError('保存に失敗しました。時間をおいて再度お試しください。');
      }
    });
  };

  function finish(target: string, test?: boolean) {
    startLeave(async () => {
      await completeOnboardingAction().catch(() => {});
      if (test) {
        const { sendTestInquiryAction } = await import(
          '@/components/onboarding/test-inquiry-action'
        );
        const { inquiryId } = await sendTestInquiryAction();
        router.push(`/inbox/${inquiryId}`);
      } else router.push(target);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, stiffness: 220 }}
      className="grid w-full max-w-[940px] grid-cols-1 overflow-hidden rounded-[18px] border border-line bg-surface shadow-lg lg:grid-cols-[minmax(0,440px)_1fr]"
    >
      <div className="flex min-w-0 flex-col gap-7 p-8 lg:p-10">
        <div className="flex items-center justify-between">
          <Logo size={24} wordmarkClassName="text-[15px]" />
          <span className="font-mono text-[11px] text-muted">
            <span className="font-semibold text-ink">0{step + 1}</span> / 03
          </span>
        </div>
        <Progress step={step} />
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepV}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 0 && (
                <ProfileStep
                  firmName={firmName}
                  signature={signature}
                  onFirmName={setFirmName}
                  onSignature={setSignature}
                  action={handleSave}
                  saving={saving}
                  error={error}
                />
              )}
              {step === 1 && (
                <InboxStep
                  inboundAddress={inboundAddress}
                  onBack={() => go(0)}
                  onNext={() => go(2)}
                />
              )}
              {step === 2 && (
                <DoneStep
                  leaving={leaving}
                  onBack={() => go(1)}
                  onTest={() => finish('/home', true)}
                  onDashboard={() => finish('/home')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-auto border-t border-line pt-4 text-[11.5px] leading-relaxed text-muted">
          守秘義務を遵守 ・ データは国内（東京）に保管 ・ 送信前に税理士が確認
        </p>
      </div>

      <div className="hidden border-l border-line bg-gradient-to-br from-accent-soft to-bg-2 lg:block">
        <OnboardingPreview step={step} firmName={previewName} signature={previewSig} />
      </div>
    </motion.div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
          <motion.span
            className="block h-full rounded-full bg-ink"
            initial={false}
            animate={{ scaleX: i <= step ? 1 : 0 }}
            style={{ originX: 0 }}
            transition={SPRING}
          />
        </span>
      ))}
    </div>
  );
}
