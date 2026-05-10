import { assignToAdmin } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  inquiryId: string;
  reason: string | null;
};

export function EscalateBanner({ inquiryId, reason }: Props) {
  return (
    <div className="escalate-banner">
      <div className="ico">
        <Icon name="alert" size={15} />
      </div>
      <div className="text">
        <div className="title">所長税理士のレビューを推奨</div>
        <div className="sub">{reason ?? '個別判断が必要なため、所長税理士にお繋ぎします。'}</div>
      </div>
      <form action={assignToAdmin}>
        <input type="hidden" name="inquiryId" value={inquiryId} />
        <button type="submit" className="assign">
          所長へ割当 <Icon name="arrow-right" size={12} />
        </button>
      </form>
    </div>
  );
}
