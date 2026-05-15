'use client';

import { type FormEvent, useActionState, useId, useRef, useState } from 'react';
import { type IngestState, ingestKnowledgeAction } from '@/app/(app)/knowledge/actions';
import { Icon } from '@/components/ui/icon';

const initial: IngestState = { error: null };
const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.md,.eml';
type Mode = 'file' | 'text';

export function IngestForm() {
  const [state, action, pending] = useActionState(ingestKnowledgeAction, initial);
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [body, setBody] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceId = useId();
  const bodyId = useId();

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(dropped);
        fileInputRef.current.files = dt.files;
      }
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  function clearFile(e: FormEvent) {
    e.preventDefault();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const ready = (mode === 'file' && file != null) || (mode === 'text' && body.trim().length > 0);

  return (
    <form action={action} className="kb-ingest">
      <div className="kb-ingest-field">
        <label htmlFor={sourceId} className="kb-ingest-label">
          出典名
        </label>
        <input
          id={sourceId}
          name="source"
          required
          placeholder="例: 事務所マニュアル §4.2"
          className="kb-ingest-input"
        />
        <p className="kb-ingest-help">
          後から検索・引用する際の見出しになります。文書のセクション番号や日付を含めると探しやすくなります。
        </p>
      </div>

      <div className="kb-ingest-mode" role="tablist" aria-label="入力方法">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={`kb-ingest-tab${mode === 'file' ? ' is-active' : ''}`}
          onClick={() => setMode('file')}
        >
          <Icon name="upload" size={13} />
          ファイル
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={`kb-ingest-tab${mode === 'text' ? ' is-active' : ''}`}
          onClick={() => setMode('text')}
        >
          <Icon name="edit" size={13} />
          テキスト貼付
        </button>
      </div>

      {mode === 'file' ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: the file input below covers the entire drop zone — the drag handlers on this wrapper just forward to it
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
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            onChange={onPick}
            className="kb-ingest-file-input"
          />
          {file ? (
            <div className="kb-ingest-file">
              <Icon name="doc" size={20} />
              <div className="kb-ingest-file-meta">
                <div className="kb-ingest-file-name">{file.name}</div>
                <div className="kb-ingest-file-size">{formatBytes(file.size)}</div>
              </div>
              <button type="button" className="kb-ingest-file-clear" onClick={clearFile}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <label htmlFor="file" className="kb-ingest-drop-empty">
              <span className="kb-ingest-drop-icon" aria-hidden>
                <Icon name="upload" size={22} />
              </span>
              <span className="kb-ingest-drop-title">ファイルをドロップ または クリックで選択</span>
              <span className="kb-ingest-drop-types">PDF · DOCX · XLSX · CSV · TXT · MD · EML</span>
            </label>
          )}
        </div>
      ) : (
        <div className="kb-ingest-field">
          <label htmlFor={bodyId} className="kb-ingest-label">
            本文
          </label>
          <textarea
            id={bodyId}
            name="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="ナレッジとして取り込む本文を貼り付けてください..."
            className="kb-ingest-textarea"
          />
          <p className="kb-ingest-help">{body.length.toLocaleString()} 文字</p>
        </div>
      )}

      {state.error && (
        <div className="kb-ingest-error" role="alert">
          <Icon name="alert" size={14} />
          {state.error}
        </div>
      )}

      <div className="kb-ingest-actions">
        <button type="submit" className="btn btn-primary" disabled={pending || !ready}>
          {pending ? '取り込み中…' : 'ナレッジに追加'}
        </button>
        <span className="kb-ingest-actions-hint">
          取り込みには数秒かかります。完了後、自動的に一覧へ戻ります。
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
