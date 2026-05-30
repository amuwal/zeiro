import { fonts } from "../fonts";
import { palette, radius, shadow } from "../theme";

export type EmailKind = "tax" | "docs" | "deadline" | "contract" | "other";

const KIND_STYLES: Record<EmailKind, { dot: string; chip: string; chipBg: string; label: string }> = {
  tax: { dot: palette.catTax, chip: palette.catTax, chipBg: palette.catTaxSoft, label: "申告" },
  docs: { dot: palette.catDocs, chip: palette.catDocs, chipBg: palette.catDocsSoft, label: "資料" },
  deadline: { dot: palette.catDeadline, chip: palette.catDeadline, chipBg: palette.catDeadlineSoft, label: "期限" },
  contract: { dot: palette.catContract, chip: palette.catContract, chipBg: palette.catContractSoft, label: "契約" },
  other: { dot: palette.muted, chip: palette.muted, chipBg: palette.surface2, label: "その他" },
};

export type EmailCardData = {
  from: string;
  subject: string;
  preview: string;
  kind: EmailKind;
};

export const EmailCard: React.FC<{
  data: EmailCardData;
  width?: number;
  emphasized?: boolean;
}> = ({ data, width = 420, emphasized = false }) => {
  const k = KIND_STYLES[data.kind];
  return (
    <div
      style={{
        width,
        backgroundColor: palette.surface,
        border: `1px solid ${emphasized ? palette.lineStrong : palette.line}`,
        borderRadius: radius.md,
        padding: "14px 18px",
        boxShadow: emphasized ? shadow.lg : shadow.sm,
        fontFamily: fonts.sans,
        color: palette.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: k.dot }} />
        <span style={{ fontSize: 13, color: palette.muted, fontWeight: 500 }}>{data.from}</span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: fonts.jp,
            fontSize: 11,
            fontWeight: 500,
            color: k.chip,
            backgroundColor: k.chipBg,
            padding: "3px 8px",
            borderRadius: radius.sm,
            letterSpacing: "0.05em",
          }}
        >
          {k.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: "-0.005em",
          marginBottom: 4,
          color: palette.ink,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.subject}
      </div>
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 13,
          color: palette.muted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.preview}
      </div>
    </div>
  );
};
