'use client';

import type { ClientImport } from '@zeiro/db';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { revalidateImportPreview } from '@/app/(app)/clients/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  imports: ClientImport[];
};

// Surface only in-flight or recently-finished imports so the panel stays
// quiet once the user has put work down. Refreshes the page via revalidate
// while anything is still parsing/importing — the list reflects DB state.
export function ClientImportsBanner({ imports }: Props) {
  const [pending, startTransition] = useTransition();
  const visible = imports.filter(isVisible);
  const hasActive = visible.some(
    (i) => i.status === 'pending' || i.status === 'parsing' || i.status === 'importing',
  );

  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      startTransition(() => {
        const form = new FormData();
        // Any import id triggers a path revalidate; we don't care which.
        form.append('importId', imports[0]?.id ?? '');
        revalidateImportPreview(form);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [hasActive, imports]);

  if (visible.length === 0) return null;

  return (
    <section className="kb-jobs">
      <header className="kb-jobs-head">
        <div>
          <div className="kb-section-eyebrow">CSV / Excel 取り込み</div>
          <h2 className="kb-jobs-title">
            {hasActive ? '取り込み処理中' : '最近の取り込み'}
            {pending && <span className="kb-jobs-spinner" aria-hidden />}
          </h2>
        </div>
        <p className="kb-jobs-hint">
          AI が列マッピングと行抽出を行います。プレビューで内容を確認してから登録されます。
        </p>
      </header>
      <ul className="kb-jobs-list">
        {visible.map((imp) => (
          <ImportRow key={imp.id} imp={imp} />
        ))}
      </ul>
    </section>
  );
}

function ImportRow({ imp }: { imp: ClientImport }) {
  const tag = STATUS_LABEL[imp.status];
  return (
    <li className={`kb-job-row status-${statusClass(imp.status)}`}>
      <span className="kb-job-status">
        {imp.status === 'preview' || imp.status === 'complete' ? (
          <Icon name="check" size={12} />
        ) : imp.status === 'failed' ? (
          <Icon name="alert" size={12} />
        ) : (
          <span className="kb-job-glyph spinner" aria-hidden />
        )}
        <span>{tag}</span>
      </span>
      <div className="kb-job-body">
        <div className="kb-job-title">
          <Link href={`/clients/import/${imp.id}`}>{imp.filename}</Link>
        </div>
        <div className="kb-job-meta">
          {imp.parsed && <span>{imp.parsed.rows.length} 件解析</span>}
          {imp.importedCount != null && <span>{imp.importedCount} 件登録</span>}
          {imp.skippedCount != null && imp.skippedCount > 0 && (
            <span>{imp.skippedCount} 件スキップ</span>
          )}
        </div>
        {imp.errorMessage && <div className="kb-job-error">{imp.errorMessage}</div>}
      </div>
    </li>
  );
}

function isVisible(imp: ClientImport): boolean {
  if (imp.status === 'pending' || imp.status === 'parsing' || imp.status === 'importing') {
    return true;
  }
  if (imp.status === 'preview') return true;
  // Recent terminal states stay visible for ~30 minutes so the user sees
  // feedback after returning to the page.
  const finishedAt = imp.completedAt ? new Date(imp.completedAt).getTime() : 0;
  return Date.now() - finishedAt < 30 * 60_000;
}

function statusClass(s: ClientImport['status']): string {
  if (s === 'pending' || s === 'parsing') return 'processing';
  if (s === 'importing') return 'processing';
  if (s === 'preview') return 'preview';
  if (s === 'complete') return 'complete';
  if (s === 'failed') return 'failed';
  return 'processing';
}

const STATUS_LABEL: Record<ClientImport['status'], string> = {
  pending: '待機中',
  parsing: 'AI 解析中',
  preview: 'レビュー待ち',
  importing: '登録中',
  complete: '完了',
  failed: '失敗',
};
