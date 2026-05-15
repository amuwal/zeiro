'use client';

import type { IngestionJob, JobStatus } from '@zeiro/db';
import { useEffect, useState, useTransition } from 'react';
import { revalidateKnowledge } from '@/app/(app)/knowledge/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  initialJobs: IngestionJob[];
  highlightJobId?: string;
};

// Live status panel for in-flight uploads. The page passes the current list
// of recent jobs as a server-rendered seed; this component polls only while
// at least one job is still in `pending` / `processing` so the page stays
// quiet once everything has settled. Polling drives revalidatePath via a
// server action, so the parent server component re-renders with fresh data.
export function JobsBanner({ initialJobs, highlightJobId }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pending, startTransition] = useTransition();
  const visible = jobs.filter((j) => isVisible(j, highlightJobId));
  const hasActive = visible.some((j) => j.status === 'pending' || j.status === 'processing');

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      startTransition(() => {
        revalidateKnowledge();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [hasActive]);

  if (visible.length === 0) return null;

  return (
    <section className="kb-jobs">
      <header className="kb-jobs-head">
        <div>
          <div className="kb-section-eyebrow">アップロード処理状況</div>
          <h2 className="kb-jobs-title">
            {hasActive ? '取り込み中' : '最近の取り込み'}
            {pending && <span className="kb-jobs-spinner" aria-hidden />}
          </h2>
        </div>
        {hasActive && (
          <p className="kb-jobs-hint">
            ファイルの解析・分割・埋め込みをバックグラウンドで実行中です。完了すると自動的に一覧に追加されます。
          </p>
        )}
      </header>
      <ul className="kb-jobs-list">
        {visible.map((job) => (
          <JobRow key={job.id} job={job} highlight={job.id === highlightJobId} />
        ))}
      </ul>
    </section>
  );
}

function JobRow({ job, highlight }: { job: IngestionJob; highlight: boolean }) {
  const elapsed = formatElapsed(job);
  return (
    <li className={`kb-job-row status-${job.status}${highlight ? ' is-highlight' : ''}`}>
      <span className="kb-job-status">
        <StatusGlyph status={job.status} />
        <span>{STATUS_LABEL[job.status]}</span>
      </span>
      <div className="kb-job-body">
        <div className="kb-job-title">{job.source}</div>
        <div className="kb-job-meta">
          <span>{job.filename}</span>
          {job.chunkCount != null && <span>{job.chunkCount} チャンク</span>}
          <span>{elapsed}</span>
        </div>
        {job.errorMessage && <div className="kb-job-error">{job.errorMessage}</div>}
      </div>
    </li>
  );
}

function StatusGlyph({ status }: { status: JobStatus }) {
  if (status === 'pending' || status === 'processing') {
    return <span className="kb-job-glyph spinner" aria-hidden />;
  }
  if (status === 'complete') return <Icon name="check" size={12} />;
  return <Icon name="alert" size={12} />;
}

// Filter rule for what to show:
// - Always show jobs that are pending/processing.
// - Show recently completed/failed jobs for ~30 minutes so the user has
//   feedback after returning to the page.
// - Always show the job the redirect just pointed at, regardless of age.
function isVisible(job: IngestionJob, highlightJobId: string | undefined): boolean {
  if (job.id === highlightJobId) return true;
  if (job.status === 'pending' || job.status === 'processing') return true;
  const completedAt = job.completedAt ? new Date(job.completedAt).getTime() : 0;
  const age = Date.now() - completedAt;
  return age < 30 * 60_000;
}

function formatElapsed(job: IngestionJob): string {
  const ref = job.completedAt ?? job.startedAt ?? job.createdAt;
  const seconds = Math.max(0, Math.round((Date.now() - new Date(ref).getTime()) / 1000));
  if (seconds < 60) return `${seconds}秒前`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
  return `${Math.floor(seconds / 3600)}時間前`;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: '待機中',
  processing: '解析中',
  complete: '完了',
  failed: '失敗',
};
