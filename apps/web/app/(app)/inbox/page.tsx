import { Icon } from '@/components/ui/icon';

export default function InboxIndexPage() {
  return (
    <section className="detail-col">
      <div className="empty">
        <div>
          <div className="ico">
            <Icon name="inbox" size={16} />
          </div>
          問い合わせを選択してください
        </div>
      </div>
    </section>
  );
}
