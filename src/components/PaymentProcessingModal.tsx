import { useEffect, useState, useRef } from "react";
import { PrinterPaymentProcessingIllustration } from "./AppIllustrations";

export type PaymentProcessStatus = "idle" | "processing" | "status_check" | "success" | "failed";

export default function PaymentProcessingModal({
  isOpen,
  status,
  progress,
  totalAmount,
  assignedToken,
  errorMessage,
  onRetry,
  onCancel,
  onContinueToToken,
}: {
  isOpen: boolean;
  status: PaymentProcessStatus;
  progress: number;
  totalAmount: string;
  assignedToken?: string;
  errorMessage?: string;
  onRetry: () => void;
  onCancel: () => void;
  onContinueToToken: () => void;
}) {
  const [statusMessage, setStatusMessage] = useState("Connecting to payment gateway…");
  const autoRedirectTimer = useRef<number | null>(null);

  useEffect(() => {
    if (status === "processing") {
      if (progress < 35) {
        setStatusMessage("Connecting to UPI / banking gateway…");
      } else if (progress < 70) {
        setStatusMessage("Verifying transaction with bank…");
      } else {
        setStatusMessage("Confirming order & generating pickup token…");
      }
    } else if (status === "status_check") {
      setStatusMessage("Checking transaction status with bank…");
    }
  }, [status, progress]);

  // Auto-navigate to Token Tracking after success is shown
  useEffect(() => {
    if (status === "success") {
      autoRedirectTimer.current = window.setTimeout(() => {
        onContinueToToken();
      }, 850);
    }
    return () => {
      if (autoRedirectTimer.current !== null) window.clearTimeout(autoRedirectTimer.current);
    };
  }, [status, onContinueToToken]);

  if (!isOpen) return null;

  return (
    <div
      className="payment-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="payment-modal-card">
        {/* ============================================================ */}
        {/* 1. PROCESSING & VERIFYING STATE */}
        {/* ============================================================ */}
        {(status === "processing" || status === "status_check") && (
          <div className="payment-modal-inner">
            <PrinterPaymentProcessingIllustration />

            <h2 id="payment-modal-title" className="payment-modal-title">
              Processing your payment...
            </h2>
            <p className="payment-modal-desc">
              Please wait while we confirm your payment.
            </p>

            <div className="payment-progress-wrapper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="payment-progress-track upload-progress-track">
                <div
                  className="payment-progress-bar upload-progress-fill"
                  style={{ width: `${Math.max(6, progress)}%` }}
                />
              </div>
            </div>

            <div className="payment-status-message-row">
              <span className="payment-status-pulsing-dot" />
              <span>{statusMessage}</span>
            </div>

            <div className="payment-amount-pill">
              <span>Amount:</span> <strong>{totalAmount}</strong>
            </div>

            {/* Cancel allowed safely only during early processing (< 40% progress) */}
            {progress < 40 && (
              <button
                type="button"
                className="payment-modal-cancel-btn"
                onClick={onCancel}
              >
                Cancel Payment
              </button>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. PAYMENT SUCCESS STATE */}
        {/* ============================================================ */}
        {status === "success" && (
          <div className="payment-modal-inner payment-success-view">
            <div className="payment-success-badge-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 id="payment-modal-title" className="payment-modal-title payment-success-title">
              Payment Successful!
            </h2>
            <p className="payment-modal-desc">
              Your payment has been confirmed.
            </p>

            {assignedToken && (
              <div className="payment-token-reveal-card">
                <span className="payment-token-label">Assigned Pickup Token</span>
                <strong className="payment-token-code">{assignedToken}</strong>
                <small className="payment-token-sub">Campus Central Counter</small>
              </div>
            )}

            <button
              type="button"
              className="payment-modal-primary-btn"
              onClick={onContinueToToken}
            >
              View Order Tracking →
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. PAYMENT FAILED STATE */}
        {/* ============================================================ */}
        {status === "failed" && (
          <div className="payment-modal-inner payment-failed-view">
            <div className="payment-failed-badge-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h2 id="payment-modal-title" className="payment-modal-title payment-failed-title">
              Payment Failed
            </h2>
            <p className="payment-modal-desc">
              {errorMessage || "We couldn't complete your payment. Please try again."}
            </p>

            <div className="payment-failed-actions">
              <button
                type="button"
                className="payment-modal-primary-btn payment-retry-btn"
                onClick={onRetry}
              >
                Retry Payment
              </button>
              <button
                type="button"
                className="payment-modal-secondary-btn"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
