import type { SVGProps } from 'react';

type MarkProps = SVGProps<SVGSVGElement> & { size?: number };

/**
 * Zeiro logomark — a geometric Z monogram on a rounded accent tile. The Z reads
 * as a triage path: inbound line → routing diagonal → outbound line, which is
 * exactly what the product does. The inset stroke is a subtle edge-light so the
 * tile reads as a crafted app icon rather than a flat block.
 */
export function Logomark({ size = 28, ...rest }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" {...rest}>
      <rect width="32" height="32" rx="8.5" fill="var(--accent)" />
      <rect
        x="0.6"
        y="0.6"
        width="30.8"
        height="30.8"
        rx="8"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.18"
        strokeWidth="1.1"
      />
      <path
        d="M10.5 11.5H21.5L10.5 20.5H21.5"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-sans font-semibold tracking-[-0.03em] ${className}`}>Zeiro</span>;
}

type LogoProps = {
  size?: number;
  wordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

export function Logo({
  size = 28,
  wordmark = true,
  className = '',
  wordmarkClassName = 'text-[18px]',
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-ink ${className}`}>
      <Logomark size={size} />
      {wordmark && <Wordmark className={wordmarkClassName} />}
    </span>
  );
}
