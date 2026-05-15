/* global React, ReactDOM, INQUIRIES, Sidebar, InboxList, Thread, Sidecar, KnowledgeTab, AnalyticsTab, SettingsTab, ClientsTab, Icon, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */
const { useState: useStateApp, useMemo: useMemoApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "comfortable",
  "showSidebarPulse": true,
  "motion": "full"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useStateApp("inbox");
  const [filter, setFilter] = useStateApp("all");
  const [category, setCategory] = useStateApp("all");
  const [channel, setChannel] = useStateApp("all");
  const [lifecycle, setLifecycle] = useStateApp("all");
  const [selectedId, setSelectedId] = useStateApp(INQUIRIES[0].id);
  const [sentToast, setSentToast] = useStateApp(false);
  const [highlightedCite, setHighlightedCite] = useStateApp(null);

  // theme
  useEffectApp(() => {
    document.documentElement.dataset.theme = tweaks.theme || "light";
    document.documentElement.dataset.motion = tweaks.motion || "full";
  }, [tweaks.theme, tweaks.motion]);

  const counts = useMemoApp(() => {
    const byChannel = {};
    for (const inq of INQUIRIES) {
      const ch = inq.channel || "email";
      byChannel[ch] = (byChannel[ch] || 0) + 1;
    }
    return {
      all: INQUIRIES.length,
      unread: INQUIRIES.filter(i => i.unread).length,
      draft: INQUIRIES.filter(i => i.status === "draft").length,
      escalated: INQUIRIES.filter(i => i.status === "escalated").length,
      sent: INQUIRIES.filter(i => i.status === "sent").length,
      byChannel,
    };
  }, []);

  const escalationRate = Math.round((counts.escalated / counts.all) * 100);
  const selected = INQUIRIES.find(i => i.id === selectedId);

  const handleSend = (id) => {
    setSentToast(true);
    setTimeout(() => setSentToast(false), 2400);
  };

  const handleOpenInquiry = (id) => {
    setSelectedId(id);
    setTab("inbox");
  };
  const handleOpenClient = () => setTab("clients");

  return (
    <div className={`app ${tweaks.density === "compact" ? "density-compact" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">z</div>
          zeiro
          <span className="brand-tag">tax-office agent</span>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab === "inbox" ? "active" : ""}`} onClick={() => setTab("inbox")}>
            受信トレイ <span className="tab-count">{counts.unread + counts.draft}</span>
          </button>
          <button className={`tab ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>
            顧問先
          </button>
          <button className={`tab ${tab === "knowledge" ? "active" : ""}`} onClick={() => setTab("knowledge")}>
            ナレッジ
          </button>
          <button className={`tab ${tab === "analytics" ? "active" : ""}`} onClick={() => setTab("analytics")}>
            パフォーマンス
          </button>
          <button className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
            設定
          </button>
        </nav>
        <div className="user-cluster">
          <button className="icon-btn"
            onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
            title="テーマ切替">
            <Icon name={tweaks.theme === "dark" ? "sun" : "moon"} size={15} />
          </button>
          <button className="icon-btn"><Icon name="search" size={15} /></button>
          <button className="icon-btn">
            <Icon name="bell" size={15} />
            <span className="dot" />
          </button>
          <button className="icon-btn" onClick={() => setTab("settings")}><Icon name="settings" size={15} /></button>
          <div style={{ width: 1, height: 20, background: "var(--line)" }} />
          <div className="avatar">SK</div>
        </div>
      </header>

      <div className="tab-stage" key={tab}>
        {tab === "inbox" && (
          <div className="workspace">
            <Sidebar
              filter={filter} setFilter={setFilter}
              category={category} setCategory={setCategory}
              channel={channel} setChannel={setChannel}
              lifecycle={lifecycle} setLifecycle={setLifecycle}
              counts={counts} escalationRate={escalationRate}
            />
            <InboxList
              inquiries={INQUIRIES}
              selectedId={selectedId}
              onSelect={setSelectedId}
              filter={filter}
              category={category}
              channel={channel}
              lifecycle={lifecycle}
            />
            <Thread
              inq={selected}
              onSend={handleSend}
              sentToast={sentToast}
              highlightedCite={highlightedCite}
              setHighlightedCite={setHighlightedCite}
            />
            <Sidecar
              inq={selected}
              highlightedCite={highlightedCite}
              onCiteHover={setHighlightedCite}
              onCiteLeave={() => setHighlightedCite(null)}
              onSend={handleSend}
              onOpenClient={handleOpenClient}
            />
          </div>
        )}

        {tab === "clients"   && <ClientsTab onOpenInquiry={handleOpenInquiry} />}
        {tab === "knowledge" && <KnowledgeTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "settings"  && <SettingsTab />}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Appearance">
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(v) => setTweak("theme", v)}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
            onChange={(v) => setTweak("density", v)}
          />
        </TweakSection>
        <TweakSection title="Motion">
          <TweakRadio
            label="Motion"
            value={tweaks.motion}
            options={[
              { value: "full",   label: "Full"   },
              { value: "reduced",label: "Reduced"},
            ]}
            onChange={(v) => setTweak("motion", v)}
          />
        </TweakSection>
        <TweakSection title="Display">
          <TweakToggle label="Sidebar urgency pulse" value={tweaks.showSidebarPulse} onChange={(v) => setTweak("showSidebarPulse", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
