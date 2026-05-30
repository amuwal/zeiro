import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/logo';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/home');
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-bg via-bg to-accent-soft px-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent-soft opacity-50 blur-3xl" />
      <div className="relative flex max-w-[560px] flex-col items-center text-center">
        <Logo size={40} wordmarkClassName="text-[26px]" />
        <h1 className="mt-9 font-sans text-[34px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink sm:text-[40px]">
          顧問先対応を、
          <br />
          AI と税理士の二人三脚で。
        </h1>
        <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
          問い合わせメールを自動でトリアージし、根拠付きの一次回答を下書き。税理士は内容を確認して送るだけです。
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center rounded-md bg-ink px-5 py-2.5 text-[13.5px] font-medium text-bg shadow-sm transition-colors hover:bg-[#1f1f1f]"
          >
            ログイン
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-md border border-line bg-surface px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-bg-2"
          >
            アカウント作成
          </Link>
        </div>
        <p className="mt-10 text-[12px] text-muted">
          税理士法 §38 守秘義務に準拠 ・ データは国内（東京）リージョンに保管
        </p>
      </div>
    </main>
  );
}
