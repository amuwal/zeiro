import { ChannelsSection } from '@/components/channels-section';
import { CitationsSection } from '@/components/citations-section';
import { ConfidenceSection } from '@/components/confidence-section';
import { CtaSection } from '@/components/cta-section';
import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { KnowledgeSection } from '@/components/knowledge-section';
import { Marquee } from '@/components/marquee';
import { MemorySection } from '@/components/memory-section';
import { NumbersSection } from '@/components/numbers-section';
import { TopBar } from '@/components/top-bar';

export default function LandingPage() {
  return (
    <div className="page">
      <div className="bg-grid" />
      <TopBar />
      <Hero />
      <Marquee />
      <ChannelsSection />
      <KnowledgeSection />
      <CitationsSection />
      <ConfidenceSection />
      <MemorySection />
      <NumbersSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
