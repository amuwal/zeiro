import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'inbox', text: '顧問先からの問い合わせを自動でトリアージ' },
  { icon: 'edit', text: 'ナレッジを根拠に、一次回答をその場で下書き' },
  { icon: 'shield', text: '送信前に税理士が確認 ・ すべての操作を監査ログに記録' },
];

export function AuthShell({
  heading,
  subtitle,
  children,
}: {
  heading: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-accent-soft via-surface to-bg-2 p-12 lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-soft opacity-60 blur-3xl" />
        <Logo size={30} wordmarkClassName="text-[20px]" />
        <div className="relative max-w-[440px]">
          <h2 className="font-sans text-[30px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink xl:text-[34px]">
            顧問先対応を、
            <br />
            AI と税理士の二人三脚で。
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
            問い合わせメールを自動で振り分け、根拠付きの返信を下書き。税理士は内容を確認して送るだけです。
          </p>
          <ul className="mt-8 flex flex-col gap-3.5">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface text-accent shadow-sm">
                  <Icon name={p.icon} size={15} />
                </span>
                <span className="pt-1 text-[13.5px] leading-relaxed text-ink-2">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] leading-relaxed text-muted">
          税理士法 §38 守秘義務に準拠 ・ データは国内（東京）リージョンに保管
        </p>
      </aside>

      <section className="flex items-center justify-center bg-surface px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 lg:hidden">
            <Logo size={28} wordmarkClassName="text-[18px]" />
          </div>
          <h1 className="font-sans text-[24px] font-semibold tracking-[-0.02em] text-ink">
            {heading}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </main>
  );
}
