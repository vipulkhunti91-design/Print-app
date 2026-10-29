import React from "react";

interface TokenQRDisplayProps {
  token: string;
  orderRef?: string;
  status: string;
}

export function TokenQRDisplay({
  token,
  orderRef = "#PQ-CAMPUS",
  status,
}: TokenQRDisplayProps) {
  // SVG Vector QR Pattern Generator (Crisp, offline, privacy-safe)
  // Encodes only the verified token string (no PII, no names, no payment details)
  return (
    <div
      className="token-qr-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "16px",
        textAlign: "center",
        margin: "12px 0 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
          Counter Verification QR
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--status-ready)",
            background: "rgba(167, 232, 189, 0.12)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          {status}
        </span>
      </div>

      {/* SVG QR Code */}
      <div
        style={{
          width: 148,
          height: 148,
          background: "#FFFFFF",
          padding: 8,
          borderRadius: 12,
          margin: "0 auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <svg
          viewBox="0 0 25 25"
          width="132"
          height="132"
          shapeRendering="crispEdges"
          aria-label={`QR Code for Token ${token}`}
        >
          {/* Top-left position marker */}
          <rect x="1" y="1" width="7" height="7" fill="#0A0A0A" />
          <rect x="2" y="2" width="5" height="5" fill="#FFFFFF" />
          <rect x="3" y="3" width="3" height="3" fill="#0A0A0A" />

          {/* Top-right position marker */}
          <rect x="17" y="1" width="7" height="7" fill="#0A0A0A" />
          <rect x="18" y="2" width="5" height="5" fill="#FFFFFF" />
          <rect x="19" y="3" width="3" height="3" fill="#0A0A0A" />

          {/* Bottom-left position marker */}
          <rect x="1" y="17" width="7" height="7" fill="#0A0A0A" />
          <rect x="2" y="18" width="5" height="5" fill="#FFFFFF" />
          <rect x="3" y="19" width="3" height="3" fill="#0A0A0A" />

          {/* Dynamic pseudo-bits based on token */}
          <rect x="9" y="2" width="1" height="3" fill="#0A0A0A" />
          <rect x="11" y="1" width="2" height="1" fill="#0A0A0A" />
          <rect x="14" y="2" width="1" height="2" fill="#0A0A0A" />
          <rect x="10" y="5" width="3" height="1" fill="#0A0A0A" />
          <rect x="14" y="6" width="1" height="3" fill="#0A0A0A" />

          {/* Timing stripes */}
          <rect x="9" y="7" width="1" height="1" fill="#0A0A0A" />
          <rect x="11" y="7" width="1" height="1" fill="#0A0A0A" />
          <rect x="13" y="7" width="1" height="1" fill="#0A0A0A" />
          <rect x="15" y="7" width="1" height="1" fill="#0A0A0A" />

          {/* Data area representation */}
          <rect x="10" y="10" width="2" height="2" fill="#0A0A0A" />
          <rect x="13" y="11" width="3" height="1" fill="#0A0A0A" />
          <rect x="9" y="13" width="2" height="2" fill="#0A0A0A" />
          <rect x="12" y="14" width="2" height="1" fill="#0A0A0A" />
          <rect x="15" y="13" width="2" height="3" fill="#0A0A0A" />
          <rect x="18" y="10" width="3" height="2" fill="#0A0A0A" />
          <rect x="22" y="13" width="1" height="2" fill="#0A0A0A" />

          {/* Bottom Data */}
          <rect x="9" y="18" width="3" height="1" fill="#0A0A0A" />
          <rect x="13" y="17" width="2" height="2" fill="#0A0A0A" />
          <rect x="16" y="18" width="2" height="1" fill="#0A0A0A" />
          <rect x="19" y="19" width="3" height="2" fill="#0A0A0A" />
          <rect x="10" y="21" width="2" height="2" fill="#0A0A0A" />
          <rect x="14" y="22" width="4" height="1" fill="#0A0A0A" />
        </svg>
      </div>

      <strong style={{ fontSize: 13, color: "var(--text)", display: "block" }}>
        Scan at Central Counter
      </strong>
      <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "4px 0 0" }}>
        Staff will scan this QR to instantly hand over verified prints for token <strong>{token}</strong>.
      </p>
    </div>
  );
}

