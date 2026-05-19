'use client';

import { useEffect, useState } from 'react';
import { ArrowIcon } from './arrow-icon';

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#channels', label: 'チャネル' },
  { href: '#knowledge', label: 'ナレッジ' },
  { href: '#citations', label: '引用' },
  { href: '#confidence', label: '信頼度' },
  { href: '#memory', label: 'メモリ' },
  { href: '#numbers', label: '実績' },
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zeiro.io';

export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="topbar-inner">
        <a className="brand" href="#top">
          <span className="brand-mark">Z</span>
          <span>Zeiro</span>
          <span className="brand-tag">tax-office agent</span>
        </a>
        <nav className="nav">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <a className="btn btn-ghost" href={APP_URL}>
            ログイン
          </a>
          <a className="btn btn-solid" href="#cta">
            事務所と話す
            <span className="arrow">
              <ArrowIcon />
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
