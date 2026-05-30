'use client';

import { AnimatePresence, motion } from 'motion/react';
import {
  DoneScene,
  DraftScene,
  RoutingScene,
} from '@/components/onboarding/onboarding-preview-scenes';

type Props = { step: number; firmName: string; signature: string };

export function OnboardingPreview({ step, firmName, signature }: Props) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28, delay: 0.12 }}
        className="w-full max-w-[330px] rounded-2xl border border-line bg-surface p-7 shadow-lg"
      >
        <div className="min-h-[224px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && <DraftScene firmName={firmName} signature={signature} />}
              {step === 1 && <RoutingScene />}
              {step === 2 && <DoneScene />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
