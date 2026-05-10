import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/inbox');
  return (
    <main style={{ padding: '4rem 2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 32, letterSpacing: '-0.02em' }}>
        Zeiro
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 15 }}>
        税理士事務所向け 顧客対応AIエージェント
      </p>
      <p style={{ marginTop: '2rem' }}>
        <Link href="/sign-in" className="btn btn-primary">
          ログイン
        </Link>
      </p>
    </main>
  );
}
