export function ClientImportFlash({ imported, skipped }: { imported: number; skipped: number }) {
  return (
    <div className="kb-flash" role="status">
      <span className="kb-flash-mark" aria-hidden>
        ✓
      </span>
      {imported}件を新たに登録しました
      {skipped > 0 && <span> (重複・無効: {skipped}件)</span>}
    </div>
  );
}
