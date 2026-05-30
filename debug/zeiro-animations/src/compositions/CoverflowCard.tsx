import type { EmailCardData, EmailKind } from "../common/EmailCard";
import { fonts } from "../fonts";
import { palette, radius, shadow } from "../theme";

const KIND_DOT: Record<EmailKind, string> = {
  tax: palette.catTax,
  docs: palette.catDocs,
  deadline: palette.catDeadline,
  contract: palette.catContract,
  other: palette.muted,
};

const SIDE_W = 360;
const SIDE_H = 430;

export const CoverflowCard: React.FC<{ data: EmailCardData; dim: number }> = ({ data, dim }) => (
  <div
    style={{
      width: SIDE_W,
      height: SIDE_H,
      backgroundColor: palette.surface,
      border: `1px solid ${palette.line}`,
      borderRadius: radius.lg,
      boxShadow: shadow.md,
      padding: 28,
      display: "flex",
      flexDirection: "column",
      filter: `brightness(${1 - dim * 0.18}) saturate(${1 - dim * 0.4})`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: KIND_DOT[data.kind] }} />
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 13,
          color: palette.muted,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {data.from}
      </span>
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 19,
        fontWeight: 700,
        color: palette.ink,
        letterSpacing: "-0.01em",
        marginTop: 20,
        lineHeight: 1.45,
      }}
    >
      {data.subject}
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 14,
        color: palette.muted,
        marginTop: 14,
        lineHeight: 1.7,
      }}
    >
      {data.preview}
    </div>
    <div
      style={{
        marginTop: "auto",
        fontFamily: fonts.mono,
        fontSize: 11,
        color: palette.muted2,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
      }}
    >
      inbox
    </div>
  </div>
);

export { SIDE_W, SIDE_H };
