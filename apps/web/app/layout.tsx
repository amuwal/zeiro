import { jaJP } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Zeiro — 税理士事務所Agent',
  description: '顧問先からの問い合わせを自動でトリアージし、一次回答を下書きするAIエージェント',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider localization={jaJP}>
      <html lang="ja">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
