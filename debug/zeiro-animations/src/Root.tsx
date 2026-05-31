import './index.css';
import { Composition } from 'remotion';
import { AgentPipeline3D } from './compositions/AgentPipeline3D';
import { DeadlineCalendar } from './compositions/DeadlineCalendar';
import { DocumentCoverflow } from './compositions/DocumentCoverflow';
import { DocumentVortex } from './compositions/DocumentVortex';
import { DraftSplit } from './compositions/DraftSplit';
import { DraftStream } from './compositions/DraftStream';
import { DraftThinking } from './compositions/DraftThinking';
import { HeroCinematic } from './compositions/HeroCinematic';
import { InboxCascade } from './compositions/InboxCascade';
import { InboxParticles } from './compositions/InboxParticles';
import { InboxPipeline } from './compositions/InboxPipeline';
import { IsoWorkflow } from './compositions/IsoWorkflow';
import { JapanGlobe } from './compositions/JapanGlobe';
import { JapanMap } from './compositions/JapanMap';
import { KnowledgeConstellation } from './compositions/KnowledgeConstellation';
import { KpiClock } from './compositions/KpiClock';
import { KpiCompare } from './compositions/KpiCompare';
import { KpiCounter } from './compositions/KpiCounter';
import { KpiMonolith } from './compositions/KpiMonolith';
import { LogoBilingual } from './compositions/LogoBilingual';
import { LogoGeometric } from './compositions/LogoGeometric';
import { LogoMinimal } from './compositions/LogoMinimal';
import { TimeReclaimed } from './compositions/TimeReclaimed';
import { TrustRedact } from './compositions/TrustRedact';
import { TrustShield } from './compositions/TrustShield';
import { TrustVault } from './compositions/TrustVault';
import { VaultSeal } from './compositions/VaultSeal';

const FPS = 30;
const W = 1920;
const H = 1080;

const wide = { fps: FPS, width: W, height: H } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* HERO — flagship 28-second piece */}
      <Composition id="HeroCinematic" component={HeroCinematic} durationInFrames={815} {...wide} />

      {/* FLAGSHIP — 3D / infographic set */}
      <Composition id="IsoWorkflow" component={IsoWorkflow} durationInFrames={270} {...wide} />
      <Composition
        id="DocumentVortex"
        component={DocumentVortex}
        durationInFrames={240}
        {...wide}
      />
      <Composition id="JapanGlobe" component={JapanGlobe} durationInFrames={300} {...wide} />
      <Composition id="KpiMonolith" component={KpiMonolith} durationInFrames={240} {...wide} />
      <Composition id="VaultSeal" component={VaultSeal} durationInFrames={240} {...wide} />
      <Composition
        id="AgentPipeline3D"
        component={AgentPipeline3D}
        durationInFrames={270}
        {...wide}
      />
      <Composition id="TimeReclaimed" component={TimeReclaimed} durationInFrames={240} {...wide} />
      <Composition
        id="DocumentCoverflow"
        component={DocumentCoverflow}
        durationInFrames={240}
        {...wide}
      />

      {/* 1. Wordmark reveal */}
      <Composition id="LogoMinimal" component={LogoMinimal} durationInFrames={150} {...wide} />
      <Composition id="LogoBilingual" component={LogoBilingual} durationInFrames={150} {...wide} />
      <Composition id="LogoGeometric" component={LogoGeometric} durationInFrames={150} {...wide} />

      {/* 2. Inbox → Order */}
      <Composition id="InboxCascade" component={InboxCascade} durationInFrames={150} {...wide} />
      <Composition
        id="InboxParticles"
        component={InboxParticles}
        durationInFrames={180}
        {...wide}
      />
      <Composition id="InboxPipeline" component={InboxPipeline} durationInFrames={240} {...wide} />

      {/* 3. AI Drafting */}
      <Composition id="DraftSplit" component={DraftSplit} durationInFrames={300} {...wide} />
      <Composition id="DraftStream" component={DraftStream} durationInFrames={260} {...wide} />
      <Composition id="DraftThinking" component={DraftThinking} durationInFrames={260} {...wide} />

      {/* 4. Trust & Compliance */}
      <Composition id="TrustRedact" component={TrustRedact} durationInFrames={210} {...wide} />
      <Composition id="TrustVault" component={TrustVault} durationInFrames={240} {...wide} />
      <Composition id="TrustShield" component={TrustShield} durationInFrames={240} {...wide} />

      {/* 5. KPI / Time saved */}
      <Composition id="KpiCounter" component={KpiCounter} durationInFrames={200} {...wide} />
      <Composition id="KpiClock" component={KpiClock} durationInFrames={210} {...wide} />
      <Composition id="KpiCompare" component={KpiCompare} durationInFrames={200} {...wide} />

      {/* Big concept stands */}
      <Composition
        id="KnowledgeConstellation"
        component={KnowledgeConstellation}
        durationInFrames={240}
        {...wide}
      />
      <Composition id="JapanMap" component={JapanMap} durationInFrames={240} {...wide} />
      <Composition
        id="DeadlineCalendar"
        component={DeadlineCalendar}
        durationInFrames={210}
        {...wide}
      />
    </>
  );
};
