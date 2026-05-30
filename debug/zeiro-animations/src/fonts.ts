import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadNotoJP } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadJetbrains } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: sansFamily } = loadInterTight("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: jpFamily } = loadNotoJP("normal", {
  weights: ["400", "500", "700"],
  subsets: ["japanese"],
});

const { fontFamily: monoFamily } = loadJetbrains("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const fonts = {
  sans: `${sansFamily}, ${jpFamily}, system-ui, -apple-system, sans-serif`,
  jp: `${jpFamily}, ${sansFamily}, system-ui, sans-serif`,
  mono: `${monoFamily}, ui-monospace, monospace`,
};
