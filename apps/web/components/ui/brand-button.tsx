'use client';

import { motion } from 'motion/react';
import type { ComponentProps } from 'react';

// Premium primary CTA for the brand-facing surfaces (onboarding, auth, landing).
// Deliberately NOT the app's global `.btn-primary` — that carries the legacy blue
// from inquiry.css's colored layer. This is the ink/teal brand identity instead.
const base =
  'inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[13px] font-medium text-bg shadow-sm transition-colors hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50';

export function BrandButton({ className = '', ...rest }: ComponentProps<typeof motion.button>) {
  return <motion.button whileTap={{ scale: 0.97 }} className={`${base} ${className}`} {...rest} />;
}
