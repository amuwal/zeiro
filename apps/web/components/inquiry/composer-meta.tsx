import { Icon } from '@/components/ui/icon';

export function ComposerMeta() {
  return (
    <div className="composer-meta">
      <div className="group">
        <span className="item">
          <Icon name="shield" size={11} /> <b>テナント分離</b> 有効
        </span>
        <span className="item">
          <Icon name="clock" size={11} /> 一次対応 <b>—</b>
        </span>
      </div>
      <span className="item">
        監査ログ <b>記録中</b>
      </span>
    </div>
  );
}
