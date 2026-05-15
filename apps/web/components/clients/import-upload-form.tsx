'use client';

import { type FormEvent, useActionState, useRef, useState } from 'react';
import { type ImportUploadState, uploadClientImport } from '@/app/(app)/clients/actions';
import { Icon } from '@/components/ui/icon';

const initial: ImportUploadState = { error: null };
const ACCEPT = '.csv,.xlsx,.xls';

export function ImportUploadForm() {
  const [state, action, pending] = useActionState(uploadClientImport, initial);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && inputRef.current) {
      setFile(dropped);
      const dt = new DataTransfer();
      dt.items.add(dropped);
      inputRef.current.files = dt.files;
    }
  }

  function clear(e: FormEvent) {
    e.preventDefault();
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <form action={action} className="kb-ingest">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the inner <input type="file"> covers the entire drop zone */}
      <div
        className={`kb-ingest-drop${dragging ? ' is-dragging' : ''}${file ? ' is-filled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id="file"
          name="file"
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="kb-ingest-file-input"
        />
        {file ? (
          <div className="kb-ingest-file">
            <Icon name="doc" size={20} />
            <div className="kb-ingest-file-meta">
              <div className="kb-ingest-file-name">{file.name}</div>
              <div className="kb-ingest-file-size">{formatBytes(file.size)}</div>
            </div>
            <button type="button" className="kb-ingest-file-clear" onClick={clear}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <label htmlFor="file" className="kb-ingest-drop-empty">
            <span className="kb-ingest-drop-icon" aria-hidden>
              <Icon name="upload" size={22} />
            </span>
            <span className="kb-ingest-drop-title">
              CSV / Excel ファイルをドロップ または クリックで選択
            </span>
            <span className="kb-ingest-drop-types">CSV · XLSX · XLS</span>
          </label>
        )}
      </div>

      {state.error && (
        <div className="kb-ingest-error" role="alert">
          <Icon name="alert" size={14} />
          {state.error}
        </div>
      )}

      <div className="kb-ingest-actions">
        <button type="submit" className="btn btn-primary" disabled={pending || file === null}>
          {pending ? 'アップロード中…' : 'AI で内容を解析'}
        </button>
        <span className="kb-ingest-actions-hint">
          解析が完了するとプレビュー画面に移動します (通常 5〜15 秒)。
        </span>
      </div>
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
