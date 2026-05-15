'use client';

import type { ImportedClient } from '@zeiro/core';
import type { ClientImport } from '@zeiro/db';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  cancelClientImport,
  confirmClientImport,
  revalidateImportPreview,
} from '@/app/(app)/clients/actions';
import { CONTRACT_OPTIONS } from '@/components/clients/contract-labels';
import { Icon } from '@/components/ui/icon';

type Props = {
  importRow: ClientImport;
};

// One client row in editable state. The Zod schema on the server rejects
// rows with no email / no name, so the UI surfaces those as warnings before
// the user clicks confirm.
type Row = {
  uid: string;
  name: string;
  primaryEmail: string;
  contractType: ImportedClient['contractType'];
  notes: string;
  sourceRow: number;
  issues: string[];
  include: boolean;
};

export function ImportPreviewView({ importRow }: Props) {
  const [pending, startTransition] = useTransition();

  // Poll while the worker is still parsing — same pattern as the knowledge
  // jobs banner. Once status flips to preview/failed we stop refreshing.
  useEffect(() => {
    if (importRow.status !== 'pending' && importRow.status !== 'parsing') return;
    const interval = setInterval(() => {
      startTransition(() => {
        const form = new FormData();
        form.append('importId', importRow.id);
        revalidateImportPreview(form);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [importRow.status, importRow.id]);

  if (importRow.status === 'pending' || importRow.status === 'parsing') {
    return <PendingState filename={importRow.filename} polling={pending} />;
  }

  if (importRow.status === 'failed') {
    return <FailedState importRow={importRow} />;
  }

  if (importRow.status === 'importing' || importRow.status === 'complete') {
    return <CompleteState importRow={importRow} />;
  }

  // status === 'preview'
  if (!importRow.parsed) return <FailedState importRow={importRow} />;
  return <PreviewState importRow={importRow} />;
}

function PendingState({ filename, polling }: { filename: string; polling: boolean }) {
  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>一括取り込み</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>{filename}</span>
          </div>
          <h1 className="kb-detail-title">
            AI で解析中
            {polling && <span className="kb-jobs-spinner" aria-hidden />}
          </h1>
          <p className="kb-detail-desc">
            列の検出と行ごとの抽出を実行しています。完了次第、プレビュー画面が表示されます (通常
            5〜15 秒)。
          </p>
        </div>
      </header>
      <div className="kb-jobs">
        <div className="kb-job-row status-processing">
          <span className="kb-job-status">
            <span className="kb-job-glyph spinner" aria-hidden />
            <span>解析中</span>
          </span>
          <div className="kb-job-body">
            <div className="kb-job-title">{filename}</div>
            <div className="kb-job-meta">
              <span>Claude Haiku で列マッピングと行の抽出を実行</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FailedState({ importRow }: { importRow: ClientImport }) {
  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>一括取り込み</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>{importRow.filename}</span>
          </div>
          <h1 className="kb-detail-title">取り込みに失敗しました</h1>
          <p className="kb-detail-desc">
            ファイルを解析できませんでした。形式やエンコードを確認のうえ、再度お試しください。
          </p>
        </div>
      </header>
      <div className="kb-jobs">
        <div className="kb-job-row status-failed">
          <span className="kb-job-status">
            <Icon name="alert" size={12} />
            <span>失敗</span>
          </span>
          <div className="kb-job-body">
            <div className="kb-job-title">{importRow.filename}</div>
            <div className="kb-job-error">
              {importRow.errorMessage ?? 'パーサーで予期しないエラーが発生しました'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CompleteState({ importRow }: { importRow: ClientImport }) {
  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>一括取り込み</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>{importRow.filename}</span>
          </div>
          <h1 className="kb-detail-title">取り込み完了</h1>
          <p className="kb-detail-desc">
            {importRow.importedCount ?? 0} 件を登録、{importRow.skippedCount ?? 0}{' '}
            件はスキップしました。
          </p>
        </div>
      </header>
    </>
  );
}

function PreviewState({ importRow }: { importRow: ClientImport }) {
  const parsed = importRow.parsed!;
  const [rows, setRows] = useState<Row[]>(() =>
    parsed.rows.map((r, i) => ({
      uid: `r-${i}-${r.sourceRow}`,
      name: r.name,
      primaryEmail: r.primaryEmail ?? '',
      contractType: r.contractType,
      notes: r.notes ?? '',
      sourceRow: r.sourceRow,
      issues: r.issues,
      include: Boolean(r.primaryEmail) && r.name.trim().length > 0,
    })),
  );

  const eligible = useMemo(
    () =>
      rows.filter(
        (r) => r.include && r.name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(r.primaryEmail),
      ),
    [rows],
  );
  const willSkip = rows.length - eligible.length;

  const payload = useMemo(
    () =>
      JSON.stringify({
        rows: eligible.map((r) => ({
          name: r.name.trim(),
          primaryEmail: r.primaryEmail.trim().toLowerCase(),
          contractType: r.contractType ?? undefined,
          notes: r.notes.trim() || null,
        })),
      }),
    [eligible],
  );

  function update(uid: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>一括取り込み</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>{importRow.filename}</span>
          </div>
          <h1 className="kb-detail-title">プレビューを確認</h1>
          <p className="kb-detail-desc">
            AI が抽出した内容を確認し、必要に応じて編集・除外してから登録してください。
            登録できない行 (メールアドレス未検出など) は自動でチェックが外れています。
          </p>
        </div>
        <aside className="kb-detail-aside">
          <dl className="kb-detail-stats">
            <div>
              <dt>登録</dt>
              <dd>{eligible.length}</dd>
            </div>
            <div>
              <dt>スキップ</dt>
              <dd className={willSkip > 0 ? '' : 'is-empty'}>{willSkip}</dd>
            </div>
          </dl>
        </aside>
      </header>

      {parsed.fileNotes.length > 0 && (
        <section className="cl-import-notes">
          <div className="kb-section-eyebrow">AI が気付いたこと</div>
          <ul>
            {parsed.fileNotes.map((note) => (
              <li key={note}>
                <Icon name="alert" size={12} /> {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cl-import-mapping">
        <div className="kb-section-eyebrow">列マッピング</div>
        <ul className="cl-import-mapping-list">
          <Mapping label="名前" value={parsed.detectedColumns.name} />
          <Mapping label="メール" value={parsed.detectedColumns.email} />
          <Mapping label="契約形態" value={parsed.detectedColumns.contractType} />
          <Mapping label="備考" value={parsed.detectedColumns.notes} />
        </ul>
      </section>

      <section className="cl-import-rows">
        <div className="cl-import-rows-head">
          <span className="kb-section-eyebrow">抽出された顧問先 ({rows.length}件)</span>
        </div>
        <div className="cl-import-table">
          <div className="cl-import-row head">
            <span />
            <span>名前</span>
            <span>メール</span>
            <span>契約形態</span>
            <span>備考</span>
            <span>元行</span>
          </div>
          {rows.map((r) => (
            <RowEditor key={r.uid} row={r} onChange={(patch) => update(r.uid, patch)} />
          ))}
        </div>
      </section>

      <footer className="cl-import-actions">
        <form action={cancelClientImport}>
          <input type="hidden" name="importId" value={importRow.id} />
          <button type="submit" className="btn btn-ghost">
            <Icon name="x" size={13} /> キャンセル
          </button>
        </form>
        <form action={confirmClientImport}>
          <input type="hidden" name="importId" value={importRow.id} />
          <input type="hidden" name="rows" value={payload} />
          <button type="submit" className="btn btn-primary" disabled={eligible.length === 0}>
            <Icon name="check" size={13} />
            {eligible.length} 件を登録
          </button>
        </form>
      </footer>
    </>
  );
}

function Mapping({ label, value }: { label: string; value: string | null }) {
  return (
    <li>
      <span className="cl-import-mapping-label">{label}</span>
      <span className={`cl-import-mapping-value${value ? '' : ' is-missing'}`}>
        {value ?? '検出されず'}
      </span>
    </li>
  );
}

function RowEditor({ row, onChange }: { row: Row; onChange: (patch: Partial<Row>) => void }) {
  const hasIssue = row.issues.length > 0;
  const isInvalid =
    !row.primaryEmail.trim() || !/^\S+@\S+\.\S+$/.test(row.primaryEmail) || !row.name.trim();
  return (
    <div
      className={`cl-import-row${hasIssue ? ' has-issue' : ''}${isInvalid ? ' is-invalid' : ''}`}
    >
      <input
        type="checkbox"
        checked={row.include}
        onChange={(e) => onChange({ include: e.target.checked })}
        disabled={isInvalid}
        aria-label="このエントリを登録する"
      />
      <input
        type="text"
        value={row.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="顧問先名"
      />
      <input
        type="email"
        value={row.primaryEmail}
        onChange={(e) => onChange({ primaryEmail: e.target.value })}
        placeholder="email@example.co.jp"
      />
      <select
        value={row.contractType ?? ''}
        onChange={(e) =>
          onChange({
            contractType: (e.target.value || null) as ImportedClient['contractType'],
          })
        }
      >
        <option value="">未設定</option>
        {CONTRACT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={row.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="備考"
      />
      <span className="cl-import-source-row">{row.sourceRow}</span>
      {row.issues.length > 0 && (
        <div className="cl-import-row-issues">
          {row.issues.map((i) => (
            <span key={i} className="cl-import-issue">
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
