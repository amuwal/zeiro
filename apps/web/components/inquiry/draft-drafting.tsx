'use client';

import { motion } from 'motion/react';
import { Icon } from '@/components/ui/icon';

const BARS = [100, 92, 76];

// Shown while the pipeline is still generating the first draft (inquiry pending,
// no draft yet). The DraftPoller refreshes the page when the draft lands.
export function DraftDrafting() {
  return (
    <div className="flex flex-col gap-3.5 rounded-md border border-line bg-bg-2 px-4 py-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.6, ease: 'linear' }}
          className="inline-flex text-accent"
        >
          <Icon name="spark" size={14} />
        </motion.span>
        AI が下書きを作成しています…
      </div>
      <div className="flex flex-col gap-2">
        {BARS.map((w, i) => (
          <motion.span
            key={w}
            className="h-2.5 rounded-full bg-line"
            style={{ width: `${w}%` }}
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.4,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-[11.5px] leading-relaxed text-muted">
        問い合わせを分類し、ナレッジを参照して一次回答を準備しています。
      </span>
    </div>
  );
}
