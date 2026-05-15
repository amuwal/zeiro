/* global React, Icon */
const { useState: useStateSet } = React;

const ME = {
  name: "さくら 田中",
  email: "test2+clerk_test@zeiro.io",
  role: "所長",
  joined: "5月10日",
  initials: "ST",
  isMe: true,
};

const SETTINGS_NAV = [
  { id: "channels",   label: "連携・チャネル", icon: "spark",    desc: "LINE / Webフォーム / Email" },
  { id: "members",    label: "メンバー",       icon: "users",    desc: "招待・役割・退職処理" },
  { id: "privacy",    label: "プライバシー",   icon: "shield",   desc: "RTBF・データ保持" },
  { id: "unlinked",   label: "未紐付けLINE",   icon: "user",     desc: "顧問先への割当" },
  { id: "office",     label: "事務所情報",     icon: "doc",      desc: "事務所名・所在地・税理士番号" },
  { id: "billing",    label: "請求・プラン",   icon: "archive",  desc: "プラン・請求先・領収書", soon: true },
  { id: "audit",      label: "監査ログ",       icon: "clock",    desc: "操作履歴・エクスポート", soon: true },
];

function SectionCard({ id, title, sub, locked, children }) {
  return (
    <section className="set-card" id={id}>
      <header className="set-card-head">
        <div>
          <h3 className="set-card-title">{title}</h3>
          {sub && <p className="set-card-sub">{sub}</p>}
        </div>
        {locked && (
          <span className="lock-pill" title="所長のみ編集可">
            <Icon name="shield" size={11} /> 所長のみ
          </span>
        )}
      </header>
      <div className="set-card-body">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, mono, copy, status }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">{label}</label>
        {status && <span className={`field-status ${status.tone || ""}`}><span className="dot" /> {status.label}</span>}
      </div>
      <div className={`field-control ${mono ? "mono" : ""} ${copy ? "with-copy" : ""}`}>
        {children}
        {copy && <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(copy)}>コピー</button>}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function ToggleRow({ checked, onChange, label, sub }) {
  return (
    <label className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {sub && <div className="toggle-sub">{sub}</div>}
      </div>
      <button
        type="button"
        className={`toggle ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="knob" />
      </button>
    </label>
  );
}

function ChannelsPanel() {
  const [secret, setSecret] = useStateSet("");
  const [token, setToken] = useStateSet("");
  const [lineEnabled, setLineEnabled] = useStateSet(false);
  const [formPublished, setFormPublished] = useStateSet(false);
  const webhook = "http://localhost:6001/api/channels/line/be11a00c-835f-49d3-8cb4-d9753f2cfcda";
  const formUrl = "http://localhost:6001/contact/be11a00c-835f-49d3-8cb4-d9753f2cfcda";

  return (
    <div className="set-stack">
      <SectionCard
        id="line"
        title="LINE Official Account 連携"
        sub="顧問先からの LINE メッセージを zeiro で受信・返信します。"
        locked
      >
        <div className="setup-steps">
          <div className="step">
            <span className="step-num">1</span>
            <div className="step-text">LINE Developers で Messaging API チャネルを作成し、下記 Webhook URL を登録します。</div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div className="step-text">Channel Secret と長期 Access Token を取得して下に貼り付けます。</div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div className="step-text">「有効化」を ON にして保存。LINE 上で 1 通テストメッセージを送って受信を確認します。</div>
          </div>
        </div>

        <Field
          label="Webhook URL"
          hint="LINE Developers コンソールの「Webhook 設定」に貼り付けてください。"
          mono copy={webhook}
          status={{ label: "未設定", tone: "warn" }}
        >
          <input value={webhook} readOnly />
        </Field>

        <div className="field-grid-2">
          <Field label="Channel Secret" hint="LINE Developers から取得" mono>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </Field>
          <Field label="Channel Access Token (long-lived)" hint="LINE Developers から取得" mono>
            <input
              type="password"
              placeholder="•••••••••••••••••••••••••••••"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </Field>
        </div>

        <ToggleRow
          checked={lineEnabled}
          onChange={setLineEnabled}
          label="この LINE チャネルを有効化"
          sub="OFF 中は受信していてもパイプラインには流れません。"
        />

        <div className="set-actions">
          <span className="save-meta"><Icon name="clock" size={11} /> 最終保存 — なし</span>
          <div className="btn-cluster">
            <button className="btn btn-secondary">テスト送信</button>
            <button className="btn btn-primary"><Icon name="check" size={13} /> 保存</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="webform"
        title="Webお問い合わせフォーム"
        sub="事務所Webサイトや名刺のQRコードから誘導できる公開フォームを提供します。送信内容は通常の問い合わせと同じパイプラインで処理されます。"
        locked
      >
        <Field
          label="Form URL"
          mono copy={formUrl}
          status={{ label: "停止中", tone: "muted" }}
        >
          <input value={formUrl} readOnly />
        </Field>

        <div className="field-grid-2">
          <Field label="フォームのタイトル">
            <input placeholder="例: 凜税理士事務所へのお問い合わせ" />
          </Field>
          <Field label="自動応答メッセージ" hint="送信完了後に表示されます。">
            <input placeholder="ご連絡ありがとうございます。1営業日以内に…" />
          </Field>
        </div>

        <ToggleRow
          checked={formPublished}
          onChange={setFormPublished}
          label="このフォームを公開する"
          sub="OFF 中は URL にアクセスしても 404 を返します。"
        />

        <div className="set-actions">
          <span className="save-meta"><Icon name="clock" size={11} /> 最終保存 — なし</span>
          <div className="btn-cluster">
            <button className="btn btn-secondary"><Icon name="arrow-right" size={13} /> プレビュー</button>
            <button className="btn btn-primary"><Icon name="check" size={13} /> 保存</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="email"
        title="メール受信エイリアス"
        sub="既存の inquiry@ メールを zeiro に転送するための専用エイリアスです。"
        locked
      >
        <Field label="エイリアスアドレス" mono copy="be11a00c@inbound.zeiro.io" status={{ label: "受信中", tone: "ok" }}>
          <input value="be11a00c@inbound.zeiro.io" readOnly />
        </Field>
        <p className="field-hint">
          既存の inquiry@rin-tax.co.jp 宛メールをこのアドレスに自動転送するよう、メールサーバーで設定してください。
        </p>
      </SectionCard>
    </div>
  );
}

function MembersPanel() {
  const [inviteEmail, setInviteEmail] = useStateSet("");
  const [inviteRole, setInviteRole] = useStateSet("メンバー");

  return (
    <div className="set-stack">
      <SectionCard
        id="members"
        title="メンバー管理"
        sub="事務所のメンバーを招待・管理します。所長は他のメンバーを管理者に昇格させたり、削除することができます。"
        locked
      >
        <div className="members-summary">
          <div>
            <div className="members-summary-label">現在のメンバー</div>
            <div className="members-summary-num">1<span className="unit">名</span></div>
          </div>
          <div className="members-summary-divider" />
          <div className="members-roles">
            <span className="role-pill"><span className="dot" style={{ background: "var(--accent)" }} /> 所長 1</span>
            <span className="role-pill"><span className="dot" /> 管理者 0</span>
            <span className="role-pill"><span className="dot" /> メンバー 0</span>
          </div>
        </div>

        <div className="member-table">
          <div className="member-row head">
            <span>名前</span>
            <span>メール</span>
            <span>役割</span>
            <span>参加日</span>
            <span style={{ textAlign: "right" }}>操作</span>
          </div>
          <div className="member-row">
            <div className="member-name">
              <div className="member-avatar">{ME.initials}</div>
              <div>
                <div className="member-name-text">
                  {ME.name}
                  <span className="me-tag">自分</span>
                </div>
                <div className="member-name-sub">所長</div>
              </div>
            </div>
            <span className="mono small muted">{ME.email}</span>
            <span className="role-badge owner">{ME.role}</span>
            <span className="mono small muted">{ME.joined}</span>
            <span style={{ textAlign: "right" }}>
              <button className="icon-btn" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
                <Icon name="more" size={14} />
              </button>
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="invite"
        title="新しいメンバーを招待"
        sub="招待リンクは 7 日間有効です。"
        locked
      >
        <div className="invite-row">
          <div className="invite-grow">
            <Field label="メールアドレス">
              <input
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </Field>
          </div>
          <div className="invite-role">
            <Field label="役割">
              <div className="seg">
                {["メンバー", "管理者"].map(r => (
                  <button
                    key={r}
                    className={`seg-btn ${inviteRole === r ? "active" : ""}`}
                    onClick={() => setInviteRole(r)}
                  >{r}</button>
                ))}
              </div>
            </Field>
          </div>
          <button className="btn btn-primary invite-send">
            <Icon name="send" size={13} /> 招待を送信
          </button>
        </div>

        <div className="role-guide">
          <div className="role-guide-row">
            <span className="role-badge owner">所長</span>
            <span className="role-guide-text">全権限。チャネル設定・RTBF実行・メンバー管理。<b>1名のみ</b>。</span>
          </div>
          <div className="role-guide-row">
            <span className="role-badge admin">管理者</span>
            <span className="role-guide-text">問い合わせ対応 + ナレッジ編集 + メンバー招待。RTBF不可。</span>
          </div>
          <div className="role-guide-row">
            <span className="role-badge member">メンバー</span>
            <span className="role-guide-text">問い合わせ対応のみ。下書きの送信には所長承認が必要なケースあり。</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PrivacyPanel() {
  const [query, setQuery] = useStateSet("");
  return (
    <div className="set-stack">
      <SectionCard
        id="rtbf"
        title="削除要求 (RTBF)"
        sub="顧問先からの個人情報削除要求 (APPI / 税理士法 §38) に対応します。"
        locked
      >
        <div className="warn-banner">
          <div className="warn-ico"><Icon name="alert" size={14} /></div>
          <div className="warn-text">
            <div className="warn-title">この操作は取り消せません</div>
            <div className="warn-sub">
              実行すると、対象顧問先の問い合わせ本文・件名・下書き・連絡先がトームストン化され、復元はできません。
              監査ログ自体は法令上の保存義務のため残ります。
            </div>
          </div>
        </div>

        <Field label="顧問先名またはメールアドレスで検索">
          <div className="search-input">
            <Icon name="search" size={13} />
            <input
              placeholder="例: 株式会社山田商事 / yamada@…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }}>検索</button>
          </div>
        </Field>

        <div className="empty-tile">
          <Icon name="search" size={16} />
          <div>顧問先名またはメールアドレスを入力して検索してください。</div>
        </div>

        <div className="kv-list">
          <div className="kv-row"><span className="kv-k">過去90日のRTBF実行</span><span className="kv-v">0 件</span></div>
          <div className="kv-row"><span className="kv-k">監査ログ保持期間</span><span className="kv-v">7 年（税理士法準拠）</span></div>
          <div className="kv-row"><span className="kv-k">トームストン後の検索</span><span className="kv-v">不可</span></div>
        </div>
      </SectionCard>

      <SectionCard
        id="retention"
        title="データ保持ポリシー"
        sub="期間経過したデータは自動的にアーカイブされます。"
        locked
      >
        <div className="kv-list">
          <div className="kv-row"><span className="kv-k">問い合わせ本文</span><span className="kv-v">7 年（事務所カスタマイズ可）</span></div>
          <div className="kv-row"><span className="kv-k">AI下書き</span><span className="kv-v">3 年</span></div>
          <div className="kv-row"><span className="kv-k">監査ログ</span><span className="kv-v">7 年（変更不可）</span></div>
          <div className="kv-row"><span className="kv-k">添付ファイル</span><span className="kv-v">7 年・暗号化保存</span></div>
        </div>
      </SectionCard>
    </div>
  );
}

function UnlinkedPanel() {
  return (
    <div className="set-stack">
      <SectionCard
        id="unlinked-line"
        title="LINE 未紐付けユーザー"
        sub="事務所宛に LINE で連絡してきたが、まだ顧問先に紐付いていないユーザーです。紐付けると以降の問い合わせが正しい顧問先のスレッドに集約されます。"
      >
        <div className="empty-tile big">
          <div className="empty-ico-bg"><Icon name="user" size={18} /></div>
          <div className="empty-title">未紐付けの LINE ユーザーはありません</div>
          <div className="empty-sub">新規ユーザーが LINE で送信してくると、ここにリストアップされます。</div>
        </div>
      </SectionCard>
    </div>
  );
}

function OfficePanel() {
  return (
    <div className="set-stack">
      <SectionCard id="office-info" title="事務所情報" sub="請求書・送信メール署名・公開フォームの「事務所名」に使われます。" locked>
        <div className="field-grid-2">
          <Field label="事務所名"><input defaultValue="税理士法人 凜事務所" /></Field>
          <Field label="代表税理士"><input defaultValue="さくら 田中" /></Field>
          <Field label="登録番号" mono><input defaultValue="第 12345 号" /></Field>
          <Field label="所在地"><input defaultValue="東京都千代田区神田神保町 1-1-1" /></Field>
          <Field label="電話番号" mono><input defaultValue="03-XXXX-XXXX" /></Field>
          <Field label="代表メール" mono><input defaultValue="info@rin-tax.co.jp" /></Field>
        </div>
        <div className="set-actions">
          <span className="save-meta"><Icon name="clock" size={11} /> 最終保存 — 2026-05-08 11:32</span>
          <div className="btn-cluster">
            <button className="btn btn-primary"><Icon name="check" size={13} /> 保存</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="set-stack">
      <SectionCard id="soon" title={title} sub="この設定は近日公開予定です。">
        <div className="empty-tile big">
          <div className="empty-ico-bg"><Icon name="spark" size={18} /></div>
          <div className="empty-title">準備中</div>
          <div className="empty-sub">公開時にメールでお知らせします。</div>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsTab() {
  const [section, setSection] = useStateSet("channels");

  const renderPanel = () => {
    switch (section) {
      case "channels": return <ChannelsPanel />;
      case "members":  return <MembersPanel />;
      case "privacy":  return <PrivacyPanel />;
      case "unlinked": return <UnlinkedPanel />;
      case "office":   return <OfficePanel />;
      case "billing":  return <ComingSoon title="請求・プラン" />;
      case "audit":    return <ComingSoon title="監査ログ" />;
      default: return null;
    }
  };

  const current = SETTINGS_NAV.find(n => n.id === section);

  return (
    <div className="settings-shell">
      <aside className="set-nav">
        <div className="set-nav-head">
          <div className="set-nav-title">設定</div>
          <div className="set-nav-sub">事務所の連携・チャネル設定<br/>(所長のみ編集可)</div>
        </div>
        <div className="set-nav-list">
          {SETTINGS_NAV.map(n => (
            <button
              key={n.id}
              className={`set-nav-item ${section === n.id ? "active" : ""}`}
              onClick={() => setSection(n.id)}
              disabled={n.soon}
            >
              <span className="set-nav-glyph"><Icon name={n.icon} size={14} /></span>
              <span className="set-nav-text">
                <span className="set-nav-label">
                  {n.label}
                  {n.soon && <span className="soon-pill">SOON</span>}
                </span>
                <span className="set-nav-desc">{n.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="set-nav-foot">
          <div className="set-nav-foot-row">
            <span>テナント</span>
            <span className="mono">be11a00c</span>
          </div>
          <div className="set-nav-foot-row">
            <span>プラン</span>
            <span>Standard</span>
          </div>
        </div>
      </aside>

      <div className="set-content" key={section}>
        <div className="set-breadcrumb">
          <span>設定</span>
          <span className="sep">/</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{current?.label}</span>
        </div>
        {renderPanel()}
      </div>
    </div>
  );
}

window.SettingsTab = SettingsTab;
