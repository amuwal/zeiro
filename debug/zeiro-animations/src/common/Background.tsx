import { AbsoluteFill } from 'remotion';
import { palette } from '../theme';

type Variant = 'cream' | 'ink' | 'surface';

export const Background: React.FC<{ variant?: Variant }> = ({ variant = 'cream' }) => {
  const fill =
    variant === 'ink' ? palette.ink : variant === 'surface' ? palette.surface : palette.bg;

  // A subtle paper-grain wash via two layered radial gradients keeps the cream
  // background from feeling flat under render.
  const grain =
    variant === 'ink'
      ? `radial-gradient(1200px 600px at 30% 20%, rgba(255,255,255,0.04), transparent 60%),
         radial-gradient(900px 500px at 70% 80%, rgba(255,255,255,0.025), transparent 65%)`
      : `radial-gradient(1200px 600px at 30% 20%, rgba(255,255,255,0.55), transparent 60%),
         radial-gradient(900px 500px at 70% 80%, rgba(20,17,13,0.035), transparent 65%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: fill }}>
      <AbsoluteFill style={{ background: grain }} />
    </AbsoluteFill>
  );
};
