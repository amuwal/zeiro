import {
  bindClientToFreee,
  unbindClientFromFreee,
} from '@/app/(app)/clients/[id]/freee-binding-actions';
import { Icon } from '@/components/ui/icon';
import { FreeeBindingTest } from './freee-binding-test';

type CompanyMini = { id: string; name: string; role: string };

type Props = {
  clientId: string;
  isFirmConnected: boolean;
  companies: CompanyMini[];
  binding: { externalId: string; externalName: string | null } | null;
};

export function FreeeBindingCard({ clientId, isFirmConnected, companies, binding }: Props) {
  if (!isFirmConnected) {
    return (
      <section className="kb-card cl-freee-binding">
        <header className="cl-freee-head">
          <h3 className="cl-freee-title">freee 事業所</h3>
          <span className="cl-freee-badge cl-freee-badge-off">事務所未連携</span>
        </header>
        <p className="cl-freee-help">
          事務所が freee と連携していないため、顧問先に事業所を紐付けることはできません。設定ページから連携してください。
        </p>
      </section>
    );
  }

  return (
    <section className="kb-card cl-freee-binding">
      <header className="cl-freee-head">
        <h3 className="cl-freee-title">freee 事業所</h3>
        {binding ? (
          <span className="cl-freee-badge cl-freee-badge-ok">
            <Icon name="check" size={11} /> 紐付け済み
          </span>
        ) : (
          <span className="cl-freee-badge cl-freee-badge-off">未紐付け</span>
        )}
      </header>

      {binding && (
        <div className="cl-freee-current">
          <div>
            <div className="cl-freee-name">
              {binding.externalName ?? `事業所 ${binding.externalId}`}
            </div>
            <div className="cl-freee-id">freee 事業所 ID: {binding.externalId}</div>
          </div>
          <form action={unbindClientFromFreee}>
            <input type="hidden" name="clientId" value={clientId} />
            <button type="submit" className="cl-freee-unbind">
              解除
            </button>
          </form>
        </div>
      )}

      {binding && <FreeeBindingTest clientId={clientId} />}

      <form action={bindClientToFreee} className="cl-freee-bind-form">
        <input type="hidden" name="clientId" value={clientId} />
        <label htmlFor="freee-company-select" className="cl-freee-label">
          {binding ? '別の事業所に変更' : '事業所を選択して紐付け'}
        </label>
        <select id="freee-company-select" name="externalId" defaultValue="" required>
          <option value="" disabled>
            -- 事業所を選択 --
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id} data-name={c.name}>
              {c.name || `事業所 ${c.id}`} ({c.role})
            </option>
          ))}
        </select>
        <input type="hidden" name="externalName" id="freee-company-name" value="" />
        <button type="submit" className="cl-freee-bind-btn">
          紐付ける
        </button>
        <CompanyNameSync />
      </form>
    </section>
  );
}

function CompanyNameSync() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trivial DOM glue for select→hidden-input sync
      dangerouslySetInnerHTML={{
        __html: `
          (function(){
            var sel = document.getElementById('freee-company-select');
            var name = document.getElementById('freee-company-name');
            if (!sel || !name) return;
            sel.addEventListener('change', function(){
              var opt = sel.options[sel.selectedIndex];
              name.value = opt && opt.getAttribute('data-name') || '';
            });
          })();
        `,
      }}
    />
  );
}
