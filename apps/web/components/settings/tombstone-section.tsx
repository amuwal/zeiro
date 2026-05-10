'use client';

import { useActionState, useState } from 'react';
import { searchClientsForTombstone } from '@/app/(app)/settings/tombstone-actions';
import { initialSearchState } from '@/app/(app)/settings/tombstone-state';
import { TombstoneConfirmForm } from './tombstone-confirm-form';

export function TombstoneSection() {
  const [search, searchAction, searching] = useActionState(
    searchClientsForTombstone,
    initialSearchState,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = search.status === 'results' ? search.results : [];
  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <section style={sectionStyle}>
      <header>
        <h2 style={headingStyle}>削除要求 (RTBF)</h2>
        <p style={leadStyle}>
          顧問先からの個人情報削除要求 (APPI / 税理士法 §38)
          に対応します。実行すると、対象顧問先の問い合わせ本文・件名・下書き・連絡先がトームストン化され、復元はできません。
          監査ログ自体は法令上の保存義務のため残ります。
        </p>
      </header>

      <form action={searchAction} style={searchFormStyle}>
        <input
          type="text"
          name="query"
          placeholder="顧問先名またはメールアドレスで検索"
          style={inputStyle}
          required
        />
        <button type="submit" className="btn btn-secondary" disabled={searching}>
          {searching ? '検索中…' : '検索'}
        </button>
      </form>

      {search.status === 'error' && (
        <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{search.message}</div>
      )}

      {search.status === 'results' && results.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          「{search.query}」に一致する顧問先は見つかりませんでした
        </div>
      )}

      {results.length > 0 && (
        <div className="member-table">
          <div
            className="member-row head"
            style={{ gridTemplateColumns: '1.4fr 1.6fr 100px 100px 80px' }}
          >
            <div>顧問先名</div>
            <div>メール</div>
            <div>契約区分</div>
            <div>問い合わせ</div>
            <div></div>
          </div>
          {results.map((c) => (
            <div
              key={c.id}
              className="member-row"
              style={{ gridTemplateColumns: '1.4fr 1.6fr 100px 100px 80px' }}
            >
              <div>{c.name}</div>
              <div className="member-mono">{c.primaryEmail}</div>
              <div className="member-mono">{c.contractType}</div>
              <div className="member-mono">{c.inquiryCount}件</div>
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  {c.id === selectedId ? '閉じる' : '選択'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <TombstoneConfirmForm client={selected} onClear={() => setSelectedId(null)} />}
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};
const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
};
const leadStyle: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: 13,
  marginTop: 6,
  lineHeight: 1.7,
};
const searchFormStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 10,
};
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13,
  outline: 'none',
};
