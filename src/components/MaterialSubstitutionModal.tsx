import React, { useState } from "react";

export type MaterialSubstitutionAlert = {
  originalMaterial: string;
  substituteMaterial: string;
  priceDifference: number; // e.g. +3 or -2
  revisedMinutes: number;
  reason: string;
};

interface MaterialSubstitutionModalProps {
  substitution: MaterialSubstitutionAlert;
  onApprove: () => void;
  onCancelOrder: () => void;
}

export function MaterialSubstitutionModal({
  substitution,
  onApprove,
  onCancelOrder,
}: MaterialSubstitutionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div
      className="payment-modal-overlay"
      style={{ zIndex: 140 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="payment-modal-card"
        style={{ maxWidth: 380, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <strong style={{ fontSize: 16, color: "var(--text)", display: "block" }}>
              Material Substitution Request
            </strong>
            <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
              Shop Operator Update
            </span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, margin: "0 0 12px" }}>
          The print shop is temporarily out of <strong>{substitution.originalMaterial}</strong>.
          The operator has proposed the following verified substitute for your review:
        </p>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Requested:</span>
            <span style={{ fontSize: 12, color: "var(--text)", textDecoration: "line-through" }}>
              {substitution.originalMaterial}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Available Alternative:</span>
            <strong style={{ fontSize: 12.5, color: "var(--accent)" }}>
              {substitution.substituteMaterial}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Price Difference:</span>
            <strong style={{ fontSize: 12, color: substitution.priceDifference <= 0 ? "var(--status-ready)" : "var(--accent)" }}>
              {substitution.priceDifference === 0
                ? "No price change (₹0)"
                : substitution.priceDifference > 0
                ? `+₹${substitution.priceDifference}`
                : `-₹${Math.abs(substitution.priceDifference)} refund`}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Revised Completion Time:</span>
            <strong style={{ fontSize: 12, color: "var(--text)" }}>
              ~{substitution.revisedMinutes} minutes
            </strong>
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 16px" }}>
          Note: Your options will not be altered without your approval. If you cancel, your payment is completely refunded.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="bill-pay-btn"
            style={{ width: "100%", height: 44, fontSize: 13 }}
            onClick={() => {
              setIsProcessing(true);
              onApprove();
            }}
            disabled={isProcessing}
          >
            {isProcessing ? "Updating Order..." : "Approve Alternative & Print"}
          </button>
          <button
            type="button"
            onClick={onCancelOrder}
            style={{
              width: "100%",
              minHeight: 44, background: "transparent", border: "1px solid rgba(248, 113, 113, 0.4)", color: "var(--error)",
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel Order & Full Refund
          </button>
        </div>
      </div>
    </div>
  );
}

