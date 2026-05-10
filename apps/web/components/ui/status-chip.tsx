type Variant = 'pending' | 'drafted' | 'escalated' | 'sent' | 'rejected';

const STYLES: Record<Variant, { cls: string; label: string }> = {
  pending: { cls: '', label: '未対応' },
  drafted: { cls: 'draft', label: '下書き済' },
  escalated: { cls: 'escalate', label: '要レビュー' },
  sent: { cls: 'sent', label: '送信済' },
  rejected: { cls: 'sent', label: '却下' },
};

export function StatusChip({ status }: { status: string }) {
  const variant = (STYLES[status as Variant] ?? STYLES.pending);
  return (
    <span className={`status-chip ${variant.cls}`}>
      <span className="dot" />
      {variant.label}
    </span>
  );
}
