import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'zeiro — 税理士事務所のための、顧客対応AI Agent',
  description:
    'メール、LINE、Webフォーム — 事務所に届くすべての問い合わせを、事務所のナレッジで自動下書き。引用付き、信頼度判定付き、所長エスカレーション付き。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
