import Link from 'next/link';
import type { AnalyticsWindow } from '@/lib/analytics-window';

const OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '7日' },
  { value: '30d', label: '30日' },
  { value: 'quarter', label: '四半期' },
];

export function PeriodPicker({ active }: { active: AnalyticsWindow }) {
  return (
    <div className="an-period">
      {OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={o.value === '30d' ? '/analytics' : `/analytics?window=${o.value}`}
          className={active === o.value ? 'active' : ''}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
