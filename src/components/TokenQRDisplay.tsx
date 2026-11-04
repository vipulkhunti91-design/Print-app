import React from "react";
import { RealQRCode } from "./RealQRCode";

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
  // 100% Real, scannable QR encoding the verified order & token
  const qrData = `PHTOPY://VERIFY?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(orderRef)}&status=${encodeURIComponent(status)}`;

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

      {/* Real High-Resolution Scannable QR Code */}
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
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <RealQRCode
          value={qrData}
          size={132}
          alt={`Real QR Code for Token ${token}`}
        />
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
export default TokenQRDisplay;
