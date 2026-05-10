/* global React, ReactDOM, INQUIRIES, Sidebar, InboxList, Detail, KnowledgeTab, AnalyticsTab, Icon, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle */
const { useState: useStateApp, useMemo: useMemoApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  accent: '#3a5d4b',
  density: 'comfortable',
  showCitations: true,
  showSidebarPulse: true,
} /*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useStateApp('inbox');
  const [filter, setFilter] = useStateApp('all');
  const [category, setCategory] = useStateApp('all');
  const [selectedId, setSelectedId] = useStateApp(INQUIRIES[0].id);
  const [sentToast, setSentToast] = useStateApp(false);

  const counts = useMemoApp(
    () => ({
      all: INQUIRIES.length,
      unread: INQUIRIES.filter((i) => i.unread).length,
      draft: INQUIRIES.filter((i) => i.status === 'draft').length,
      escalated: INQUIRIES.filter((i) => i.status === 'escalated').length,
      sent: INQUIRIES.filter((i) => i.status === 'sent').length,
    }),
    [],
  );

  const escalationRate = Math.round((counts.escalated / counts.all) * 100);

  const selected = INQUIRIES.find((i) => i.id === selectedId);

  // Apply accent tweak
  useEffectApp(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.accent]);

  const handleSend = (id) => {
    setSentToast(true);
    setTimeout(() => setSentToast(false), 2400);
  };

  return (
    <div className={`app ${tweaks.density === 'compact' ? 'density-compact' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">z</div>
          zeiro
          <span className="brand-tag">tax-office agent</span>
        </div>
        <nav className="tabs">
          <button
            className={`tab ${tab === 'inbox' ? 'active' : ''}`}
            onClick={() => setTab('inbox')}
          >
            受信トレイ <span className="tab-count">{counts.unread + counts.draft}</span>
          </button>
          <button
            className={`tab ${tab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setTab('knowledge')}
          >
            ナレッジ
          </button>
          <button
            className={`tab ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            パフォーマンス
          </button>
        </nav>
        <div className="user-cluster">
          <button className="icon-btn">
            <Icon name="search" size={15} />
          </button>
          <button className="icon-btn">
            <Icon name="bell" size={15} />
            <span className="dot" />
          </button>
          <button className="icon-btn">
            <Icon name="settings" size={15} />
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
          <div className="avatar">SK</div>
        </div>
      </header>

      {tab === 'inbox' && (
        <div className="workspace">
          <Sidebar
            filter={filter}
            setFilter={setFilter}
            category={category}
            setCategory={setCategory}
            counts={counts}
            escalationRate={escalationRate}
          />
          <InboxList
            inquiries={INQUIRIES}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            category={category}
          />
          <Detail inq={selected} onSend={handleSend} sentToast={sentToast} />
        </div>
      )}

      {tab === 'knowledge' && <KnowledgeTab />}
      {tab === 'analytics' && <AnalyticsTab />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent">
          <TweakColor
            label="Primary accent"
            value={tweaks.accent}
            options={['#3a5d4b', '#3d4a73', '#74543b', '#5e3d56', '#1f1c17']}
            onChange={(v) => setTweak('accent', v)}
          />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />
        </TweakSection>
        <TweakSection title="Display">
          <TweakToggle
            label="Show citations"
            value={tweaks.showCitations}
            onChange={(v) => setTweak('showCitations', v)}
          />
          <TweakToggle
            label="Sidebar urgency pulse"
            value={tweaks.showSidebarPulse}
            onChange={(v) => setTweak('showSidebarPulse', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
