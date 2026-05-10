import { assignToAdmin, retryDraft } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  inquiryId: string;
  reason: string | null;
  failureType: string | null;
};

export function EscalateBanner({ inquiryId, reason, failureType }: Props) {
  const isFailure = failureType !== null;
  const title = isFailure ? 'AI 処理に失敗しました' : '所長税理士のレビューを推奨';
  const sub = isFailure
    ? (reason ?? 'AI パイプラインが失敗しました。再試行するか所長へお繋ぎください。')
    : (reason ?? '個別判断が必要なため、所長税理士にお繋ぎします。');

  return (
    <div className={`escalate-banner${isFailure ? ' failure' : ''}`}>
      <div className="ico">
        <Icon name="alert" size={15} />
      </div>
      <div className="text">
        <div className="title">{title}</div>
        <div className="sub">{sub}</div>
      </div>
      <div className="escalate-actions">
        {isFailure && (
          <form action={retryDraft}>
            <input type="hidden" name="inquiryId" value={inquiryId} />
            <button type="submit" className="assign">
              再試行 <Icon name="arrow-right" size={12} />
            </button>
          </form>
        )}
        <form action={assignToAdmin}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <button type="submit" className="assign">
            所長へ割当 <Icon name="arrow-right" size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
