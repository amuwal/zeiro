'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type SceneProps = { firmName: string; signature: string };

// Briefly washes a teal highlight out each time `value` changes — this is how the
// firm watches its own name land in the reply.
function Flash({ value, children }: { value: string; children: ReactNode }) {
  return (
    <motion.span
      key={value}
      initial={{ backgroundColor: 'rgba(40,160,154,0.22)' }}
      animate={{ backgroundColor: 'rgba(40,160,154,0)' }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="rounded-[3px] px-0.5 font-medium text-ink"
    >
      {children}
    </motion.span>
  );
}

function SceneHead({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={17} />
      </span>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
    </div>
  );
}

export function DraftScene({ firmName, signature }: SceneProps) {
  const firm = firmName.trim() || '事務所名';
  const sign = signature.trim() || '担当者署名';
  return (
    <div className="flex flex-col gap-5">
      <SceneHead icon="spark" title="AI 下書き" sub="田中商事様 への返信" />
      <div className="flex flex-col gap-3 text-[12.5px] leading-[1.85] text-ink-2">
        <p>
          いつもお世話になっております。
          <Flash value={firm}>{firm}</Flash> 担当でございます。
        </p>
        <p>お問い合わせの申告期限について、ご案内いたします。</p>
      </div>
      <div className="border-t border-line pt-4 text-[12.5px]">
        <Flash value={sign}>{sign}</Flash>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon name="shield" size={12} /> 税理士が確認してから送信されます
      </p>
    </div>
  );
}

const FLOW: { icon: IconName; label: string }[] = [
  { icon: 'inbox', label: '顧問先からメールが届く' },
  { icon: 'filter', label: '自動でトリアージ' },
  { icon: 'edit', label: 'AI が下書きを作成' },
];

export function RoutingScene() {
  return (
    <div className="flex flex-col gap-5">
      <SceneHead icon="inbox" title="自動で、下書きまで" sub="あなたは確認するだけ" />
      <div className="flex flex-col gap-4 pl-0.5">
        {FLOW.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 + i * 0.1, type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-center gap-3"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-bg-2 text-muted">
              <Icon name={s.icon} size={13} />
            </span>
            <span className="text-[12.5px] text-ink-2">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function DoneScene() {
  return (
    <div className="flex flex-col gap-5">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name="check" size={22} />
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          準備が整いました
        </span>
        <span className="text-[12.5px] leading-relaxed text-muted">
          テスト問い合わせを送って、AI の下書きをその場で確認しましょう。
        </span>
      </div>
    </div>
  );
}
