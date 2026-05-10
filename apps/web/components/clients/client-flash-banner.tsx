export function ClientFlashBanner({ deleted }: { deleted: boolean }) {
  if (!deleted) return null;
  return (
    <div className="bg-accent-soft text-accent-ink rounded-md px-3.5 py-2.5 text-[12.5px]">
      顧問先を削除しました
    </div>
  );
}
