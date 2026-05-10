import type { ClientDetail } from '@zeiro/db';
import { CONTRACT_LABELS } from './contract-labels';

const SOURCE_LABELS: Record<string, string> = {
  manual: '手動登録',
  web_form: 'Webフォーム',
  email_promotion: 'メール経由',
  line: 'LINE',
  seeded: 'シードデータ',
  csv: 'CSV取込',
  api: 'API',
};

export function ClientDetailHeader({ client }: { client: ClientDetail }) {
  return (
    <>
      <h1 className="cl-detail-title">{client.name}</h1>
      <div className="cl-detail-meta">
        <div>
          <strong>{client.primaryEmail}</strong>
          <span className={`cl-pill ${client.contractType}`} style={{ marginLeft: 10 }}>
            {CONTRACT_LABELS[client.contractType] ?? client.contractType}
          </span>
        </div>
        <div>
          担当: <strong>{client.assignedToName ?? '未設定'}</strong> · 問い合わせ:{' '}
          <strong>{client.inquiryCount}件</strong>
          {client.lastContactAt && (
            <>
              {' '}
              · 最終連絡:{' '}
              <strong>{new Date(client.lastContactAt).toLocaleDateString('ja-JP')}</strong>
            </>
          )}
        </div>
        <div>
          登録: <strong>{SOURCE_LABELS[client.source ?? ''] ?? client.source ?? '—'}</strong>
          {client.createdAt && (
            <>
              {' '}
              · 登録日: <strong>{new Date(client.createdAt).toLocaleDateString('ja-JP')}</strong>
            </>
          )}
        </div>
      </div>
    </>
  );
}
