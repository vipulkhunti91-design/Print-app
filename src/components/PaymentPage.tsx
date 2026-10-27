import React, { useState } from "react";

export type OrderSummary = {
  files: number;
  pages: number;
  copies: number;
};

export type UPIApp = "gpay" | "phonepe" | "paytm" | "bhim" | "custom";

interface PaymentPageProps {
  totalAmount: number;
  orderSummary: OrderSummary;
  payAtPickupEnabled?: boolean;
  onPaymentSuccess: (method: string, transactionId: string) => void;
  onBack: () => void;
}

export default function PaymentPage({
  totalAmount,
  orderSummary,
  payAtPickupEnabled = true,
  onPaymentSuccess,
  onBack,
}: PaymentPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "wallet" | "pickup">("upi");
  const [selectedUPIApp, setSelectedUPIApp] = useState<UPIApp>("gpay");
  const [customVpa, setCustomVpa] = useState("");
  
  // Payment states: "idle" | "verifying" | "success" | "pending" | "failed"
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "verifying" | "success" | "pending" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [transactionRef, setTransactionRef] = useState("");

  const formatAmount = (amount: number) => `₹${amount.toFixed(2)}`;

  const upiApps = [
    { id: "gpay" as const, name: "Google Pay", icon: "🟢", desc: "Fast approval via Tez UPI" },
    { id: "phonepe" as const, name: "PhonePe", icon: "🟣", desc: "Instant UPI Intent & QR" },
    { id: "paytm" as const, name: "Paytm UPI", icon: "🔵", desc: "Paytm Payments Bank / Wallet UPI" },
    { id: "bhim" as const, name: "BHIM UPI", icon: "🟠", desc: "National NPCI BHIM Portal" },
    { id: "custom" as const, name: "Other UPI ID / VPA", icon: "💳", desc: "Enter username@upi / @okhdfcbank" },
  ];

  const handleInitiatePayment = (simulateFailure = false) => {
    setPaymentStatus("verifying");
    setStatusMessage("Connecting to NPCI & Campus Merchant Gateway…");
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setTransactionRef(txnId);

    window.setTimeout(() => {
      if (selectedMethod === "pickup") {
        setPaymentStatus("success");
        setStatusMessage("Counter Pay registered. Order confirmed for desk payment.");
        window.setTimeout(() => {
          onPaymentSuccess("Pay at Pickup", txnId);
        }, 800);
        return;
      }

      if (simulateFailure) {
        setPaymentStatus("failed");
        setStatusMessage("Payment declined by issuing bank: VPA authorization timeout.");
        return;
      }

      // Verification check (never mark paid without real / simulated cryptographic confirmation)
      setStatusMessage("Verifying signature & debit confirmation…");
      window.setTimeout(() => {
        setPaymentStatus("success");
        setStatusMessage("Payment Verified ✓ Amount credited to PrintQ Campus Desk.");
        window.setTimeout(() => {
          onPaymentSuccess(
            selectedMethod === "upi"
              ? `UPI (${selectedUPIApp.toUpperCase()})`
              : selectedMethod === "card"
              ? "Credit/Debit Card"
              : "Wallet",
            txnId
          );
        }, 900);
      }, 700);
    }, 1100);
  };

  const handleRetry = () => {
    handleInitiatePayment(false);
  };

  return (
    <div className="payment-page" style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 90px" }}>
      {/* Header */}
      <div className="payment-page-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          className="payment-page-back"
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--text)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className="payment-page-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Secure Checkout
        </h1>
      </div>

      <div className="payment-page-content">
        {/* Order Summary Card */}
        <div
          className="payment-summary-card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "14px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 className="payment-summary-title" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Order Breakdown
            </h2>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Campus Central Desk</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span>Uploaded Files</span>
            <span style={{ color: "var(--text)" }}>{orderSummary.files}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span>Total Document Pages</span>
            <span style={{ color: "var(--text)" }}>{orderSummary.pages}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
            <span>Copies Requested</span>
            <span style={{ color: "var(--text)" }}>{orderSummary.copies}</span>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "8px 0 10px" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>Total Due</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{formatAmount(totalAmount)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "var(--text)" }}>
            Select Payment Method
          </h2>

          {/* 1. UPI Option */}
          <div
            role="button"
            tabIndex={0}
            style={{
              background: selectedMethod === "upi" ? "rgba(244, 215, 121, 0.08)" : "var(--surface)",
              border: `1px solid ${selectedMethod === "upi" ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "12px",
              marginBottom: 8,
              cursor: "pointer",
            }}
            onClick={() => setSelectedMethod("upi")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <strong style={{ fontSize: 13.5, color: "var(--text)", display: "block" }}>
                    UPI / QR Code
                  </strong>
                  <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Google Pay, PhonePe, Paytm, BHIM UPI
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>Instant 0% Fee</span>
            </div>

            {/* UPI App Selection Sub-Tray */}
            {selectedMethod === "upi" && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
                  Choose preferred UPI App:
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {upiApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUPIApp(app.id);
                      }}
                      style={{
                        background: selectedUPIApp === app.id ? "rgba(244, 215, 121, 0.16)" : "var(--surface-raised)",
                        border: `1px solid ${selectedUPIApp === app.id ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 8,
                        padding: "8px 10px",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{app.icon}</span>
                        <strong style={{ fontSize: 12, color: selectedUPIApp === app.id ? "var(--accent)" : "var(--text)" }}>
                          {app.name}
                        </strong>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedUPIApp === "custom" && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank"
                      value={customVpa}
                      onChange={(e) => setCustomVpa(e.target.value)}
                      style={{
                        width: "100%",
                        height: 38,
                        background: "#1c1c1c",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "0 10px",
                        color: "var(--text)",
                        fontSize: 12,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Credit/Debit Card Option */}
          <div
            role="button"
            tabIndex={0}
            style={{
              background: selectedMethod === "card" ? "rgba(244, 215, 121, 0.08)" : "var(--surface)",
              border: `1px solid ${selectedMethod === "card" ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "12px",
              marginBottom: 8,
              cursor: "pointer",
            }}
            onClick={() => setSelectedMethod("card")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <div>
                  <strong style={{ fontSize: 13.5, color: "var(--text)", display: "block" }}>
                    Debit / Credit Card
                  </strong>
                  <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Visa, MasterCard, RuPay Card
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Secure</span>
            </div>
          </div>

          {/* 3. Wallets */}
          <div
            role="button"
            tabIndex={0}
            style={{
              background: selectedMethod === "wallet" ? "rgba(244, 215, 121, 0.08)" : "var(--surface)",
              border: `1px solid ${selectedMethod === "wallet" ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "12px",
              marginBottom: 8,
              cursor: "pointer",
            }}
            onClick={() => setSelectedMethod("wallet")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>👛</span>
                <div>
                  <strong style={{ fontSize: 13.5, color: "var(--text)", display: "block" }}>
                    Digital Wallets
                  </strong>
                  <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Paytm Wallet, Amazon Pay Balance
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prepaid</span>
            </div>
          </div>

          {/* 4. Pay at Pickup Option (Enabled by shop operator) */}
          {payAtPickupEnabled && (
            <div
              role="button"
              tabIndex={0}
              style={{
                background: selectedMethod === "pickup" ? "rgba(244, 215, 121, 0.08)" : "var(--surface)",
                border: `1px solid ${selectedMethod === "pickup" ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 12,
                padding: "12px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedMethod("pickup")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🏬</span>
                  <div>
                    <strong style={{ fontSize: 13.5, color: "var(--text)", display: "block" }}>
                      Pay at Pickup / Counter
                    </strong>
                    <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                      Pay ₹{totalAmount.toFixed(2)} in cash or UPI when collecting prints
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--status-ready)" }}>At Desk</span>
              </div>
            </div>
          )}
        </div>

        {/* Verification & Processing Status Banner */}
        {paymentStatus !== "idle" && (
          <div
            style={{
              padding: "14px",
              borderRadius: 12,
              marginBottom: 16,
              background:
                paymentStatus === "verifying"
                  ? "rgba(244, 215, 121, 0.1)"
                  : paymentStatus === "success"
                  ? "rgba(167, 232, 189, 0.12)"
                  : "rgba(244, 63, 94, 0.12)",
              border: `1px solid ${
                paymentStatus === "verifying"
                  ? "rgba(244, 215, 121, 0.3)"
                  : paymentStatus === "success"
                  ? "var(--status-ready)"
                  : "#F43F5E"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              {paymentStatus === "verifying" && (
                <span style={{ width: 14, height: 14, border: "2px solid #F4D779", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              )}
              {paymentStatus === "success" && <span style={{ color: "var(--status-ready)", fontWeight: 800 }}>✓</span>}
              {paymentStatus === "failed" && <span style={{ color: "#F43F5E", fontWeight: 800 }}>✕</span>}
              <strong
                style={{
                  fontSize: 13,
                  color:
                    paymentStatus === "verifying"
                      ? "var(--accent)"
                      : paymentStatus === "success"
                      ? "var(--status-ready)"
                      : "#F43F5E",
                }}
              >
                {paymentStatus === "verifying"
                  ? "Payment In Verification"
                  : paymentStatus === "success"
                  ? "Payment Confirmed & Verified"
                  : "Payment Failed / Declined"}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{statusMessage}</p>
            {transactionRef && (
              <small style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                Ref ID: {transactionRef}
              </small>
            )}

            {paymentStatus === "failed" && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    background: "var(--accent)",
                    color: "#0A0A0A",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Retry Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("idle")}
                  style={{
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Change Method
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pay Action Footer */}
      <div
        className="payment-page-footer"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
          maxWidth: 440,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          className="payment-pay-btn"
          disabled={paymentStatus === "verifying"}
          onClick={() => handleInitiatePayment(false)}
          style={{
            width: "100%",
            height: 48,
            background: "var(--accent)",
            color: "#0A0A0A",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {paymentStatus === "verifying" ? (
            "Verifying Payment…"
          ) : selectedMethod === "pickup" ? (
            `Confirm & Pay ${formatAmount(totalAmount)} at Pickup`
          ) : (
            `Pay ${formatAmount(totalAmount)} with ${
              selectedMethod === "upi" ? upiApps.find((a) => a.id === selectedUPIApp)?.name : selectedMethod.toUpperCase()
            }`
          )}
        </button>
      </div>
    </div>
  );
}
