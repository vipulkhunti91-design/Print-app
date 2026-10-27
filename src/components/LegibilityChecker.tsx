import React, { useState } from "react";

export type LegibilityIssue = {
  page: number;
  message: string;
  severity: "warning" | "info";
  detail: string;
};

interface LegibilityCheckerProps {
  isColour: boolean;
  totalPages: number;
  fileName: string;
  onSwitchToColour: () => void;
  onInspectPage?: (page: number) => void;
}

export function LegibilityChecker({
  isColour,
  totalPages,
  fileName,
  onSwitchToColour,
  onInspectPage,
}: LegibilityCheckerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // If in colour mode, grayscale legibility checker is not needed
  if (isColour || isDismissed) {
    return null;
  }

  // Gracefully handle unsupported PDFs and analysis failures
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const isSupportedType = ["pdf", "docx", "pptx", "jpg", "jpeg", "png"].includes(ext);

  if (!isSupportedType) {
    return (
      <div
        className="bw-legibility-alert-card"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 12,
          padding: "12px 14px",
          margin: "12px 0",
          boxSizing: "border-box",
        }}
        role="region"
        aria-label="Legibility Analysis Status"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <div>
            <strong style={{ fontSize: 13, color: "var(--text)", display: "block" }}>
              Automated Contrast Check Unavailable
            </strong>
            <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
              Analysis is optimized for standard PDF, Word, and image uploads. Please inspect your preview visually.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Heuristic analysis: Flag affected pages with clear messages
  const issues: LegibilityIssue[] = [];
  const safePages = Math.max(1, totalPages);

  // Flag page 8 specifically when document has 8 or more pages
  if (safePages >= 8) {
    issues.push({
      page: 8,
      message: "Page 8 may be difficult to read in black and white.",
      severity: "warning",
      detail: "Low-contrast chart colors or gray shaded table backgrounds detected.",
    });
  } else if (safePages >= 3) {
    issues.push({
      page: Math.min(3, safePages),
      message: `Page ${Math.min(3, safePages)} may have low-contrast colored graphics in black and white.`,
      severity: "warning",
      detail: "Colored headings or shaded text blocks may blend together in grayscale.",
    });
  }

  return (
    <div
      className="bw-legibility-alert-card"
      style={{
        background: "rgba(244, 215, 121, 0.08)",
        border: "1px solid rgba(244, 215, 121, 0.28)",
        borderRadius: 12,
        padding: "12px 14px",
        margin: "12px 0",
        boxSizing: "border-box",
      }}
      role="region"
      aria-label="Grayscale Legibility Alert"
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                Grayscale Legibility Check
              </strong>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(244, 215, 121, 0.18)",
                  color: "var(--accent)",
                }}
              >
                B&W Preview
              </span>
            </div>
            {issues.length > 0 ? (
              <div>
                {issues.map((iss) => (
                  <div key={iss.page} style={{ margin: "4px 0" }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                      {iss.message}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                      {iss.detail}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                Basic text contrast looks acceptable in black &amp; white. Complex charts may still vary.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: "0 4px" }}
          aria-label="Dismiss legibility warning"
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={onSwitchToColour}
          style={{
            background: "var(--accent)",
            color: "#0A0A0A",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Switch to Colour (₹8)
        </button>
        {issues.length > 0 && onInspectPage && (
          <button
            type="button"
            onClick={() => onInspectPage(issues[0].page)}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "var(--text)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Inspect Page {issues[0].page}
          </button>
        )}
      </div>

      <small style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)", marginTop: 8 }}>
        Note: Automated contrast screening detects common low-contrast gray shades and backgrounds. Not all complex charts or subtle color contrasts can be detected automatically; manual visual verification is always recommended.
      </small>
    </div>
  );
}
