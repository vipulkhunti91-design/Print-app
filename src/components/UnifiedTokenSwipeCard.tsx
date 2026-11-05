import React, { useState, useEffect, useCallback } from "react";
import { TrackingStatusIllustration } from "./AppIllustrations";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import { sanitizeDisplayFileName } from "../utils/sanitizeFileName";
import { RealQRCode } from "./RealQRCode";

interface UnifiedTokenSwipeCardProps {
  token: string;
  orderRef?: string;
  statusText: string;
  stageIndex: number;
  etaText: string;
  fileName: string;
  pages: number;
  colour: boolean;
  onOpenCustomTime?: () => void;
  language?: SupportedLanguage;
  targetReadyDate?: Date;
  readyTimeFormatted?: string;
  initialMinutes?: number;
  isReady?: boolean;
  isCompleted?: boolean;
  paymentMethod?: "UPI" | "Cash" | string;
  paymentStatus?: "paid" | "unpaid" | "pending";
  totalAmount?: number;
}

export function UnifiedTokenSwipeCard({
  token,
  orderRef = "#PQ-CAMPUS",
  statusText,
  stageIndex,
  etaText,
  fileName,
  pages,
  colour,
  onOpenCustomTime,
  language = "en",
  targetReadyDate,
  readyTimeFormatted,
  initialMinutes = 5,
  isReady = false,
  isCompleted = false,
  paymentMethod = "UPI",
  paymentStatus,
  totalAmount = 2.0,
}: UnifiedTokenSwipeCardProps) {
  const isCash = paymentMethod === "Cash" || paymentStatus === "unpaid";
  const amount = totalAmount || 2.0;
  const [activeTab, setActiveTab] = useState<"token" | "qr">("token");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const minSwipeDistance = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance) {
      // Swiped Left -> reveal QR
      setActiveTab("qr");
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> reveal Token
      setActiveTab("token");
    }
  };

  // Mouse drag support for desktop
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX === null) return;
    const distance = mouseStartX - e.clientX;
    if (distance > minSwipeDistance) {
      setActiveTab("qr");
    } else if (distance < -minSwipeDistance) {
      setActiveTab("token");
    }
    setMouseStartX(null);
  };

  // Target timestamp: ensure an active countdown timer is always ticking down
  const getTargetTimestamp = useCallback(() => {
    if (targetReadyDate && targetReadyDate.getTime() > Date.now() + 5000) {
      return targetReadyDate.getTime();
    }
    // Fallback: active 5-minute countdown so user always sees the reverse countdown ticking
    return Date.now() + (initialMinutes || 5) * 60 * 1000;
  }, [targetReadyDate, initialMinutes]);

  const [targetTs, setTargetTs] = useState<number>(getTargetTimestamp);

  useEffect(() => {
    setTargetTs(getTargetTimestamp());
  }, [getTargetTimestamp]);

  // Reverse Countdown Timer Calculation (Ticks every second)
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (isCompleted) return 0;
    return Math.max(0, Math.floor((targetTs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (isCompleted) {
      setSecondsLeft(0);
      return;
    }

    const computeTime = () => {
      const diff = Math.max(0, Math.floor((targetTs - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    computeTime();
    const interval = window.setInterval(computeTime, 1000);
    return () => window.clearInterval(interval);
  }, [targetTs, isCompleted]);

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return "00:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hrs > 0) {
      return `${hrs}h ${String(mins).padStart(2, "0")}m ${String(remainingSecs).padStart(2, "0")}s`;
    }
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  return (
    <div
      className="unified-token-swipe-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "16px",
        margin: "0 0 16px",
        textAlign: "center",
        position: "relative",
        userSelect: "none",
        cursor: "grab",
        boxSizing: "border-box",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
      }}
    >
      {/* Top Segmented Pill Switcher */}
      <div
        style={{
          display: "flex",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: 999,
          padding: 3,
          marginBottom: 14,
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("token")}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: 999,
            border: "none",
            background: activeTab === "token" ? "var(--accent)" : "transparent",
            color: activeTab === "token" ? "var(--on-accent)" : "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 150ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>🎫</span>
          <span>{getTranslation(language, "pickup_token")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("qr")}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: 999,
            border: "none",
            background: activeTab === "qr" ? "var(--accent)" : "transparent",
            color: activeTab === "qr" ? "var(--on-accent)" : "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 150ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>📱</span>
          <span>{getTranslation(language, "counter_qr")}</span>
        </button>
      </div>

      {/* Slide 1: Token & Estimated Ready Time with Reverse Countdown Timer */}
      {activeTab === "token" && (
        <div style={{ animation: "fadeIn 200ms ease" }}>
          <TrackingStatusIllustration stageIndex={stageIndex} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 4,
            }}
          >
            {getTranslation(language, "pickup_token")}
          </span>
          <strong
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "var(--accent)",
              letterSpacing: "0.05em",
              lineHeight: 1,
              display: "block",
              margin: "4px 0 8px",
            }}
          >
            {token}
          </strong>

          {/* Live Reverse Countdown Timer Pill */}
          <div
            onClick={onOpenCustomTime}
            role={onOpenCustomTime ? "button" : undefined}
            tabIndex={onOpenCustomTime ? 0 : undefined}
            aria-label="Live reverse countdown to ready time. Tap to customize"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: isReady || isCompleted ? "var(--status-ready)" : "var(--accent)",
              margin: "6px auto 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: isReady || isCompleted ? "rgba(167, 232, 189, 0.12)" : "rgba(244, 215, 121, 0.08)",
              borderRadius: 999,
              border: `1px solid ${isReady || isCompleted ? "rgba(167, 232, 189, 0.35)" : "rgba(244, 215, 121, 0.28)"}`,
              cursor: onOpenCustomTime ? "pointer" : "default",
              transition: "all 180ms ease",
              boxShadow: isReady || isCompleted ? "0 0 14px rgba(167, 232, 189, 0.22)" : "0 0 12px rgba(244, 215, 121, 0.12)",
            }}
          >
            <span style={{ fontSize: 13 }}>
              {isReady || isCompleted ? "🎉" : "⏱️"}
            </span>

            {isCompleted ? (
              <span>
                {language === "gu" ? "પ્રિન્ટ મેળવી લીધી (Completed)" : language === "hi" ? "प्रिंट प्राप्त किया गया (Completed)" : "Collected & Completed"}
              </span>
            ) : isReady ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span>
                  {language === "gu" ? "પ્રિન્ટ તૈયાર છે · કાઉન્ટર પર મેળવો" : language === "hi" ? "प्रिंट तैयार है · काउंटर पर प्राप्त करें" : "Ready for Pickup at Counter!"}
                </span>
                <strong
                  style={{
                    color: "var(--accent)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                    fontSize: 12.5,
                  }}
                >
                  · ⏱️ {secondsLeft > 0 ? formatCountdown(secondsLeft) : "Counter Open"}
                </strong>
              </span>
            ) : secondsLeft <= 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>{language === "gu" ? "પ્રિન્ટ પૂર્ણ થવાના આરે છે" : language === "hi" ? "प्रिंट लगभग तैयार" : "Finishing Up · Ready Any Second"}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({readyTimeFormatted || etaText.replace(/^⏱\s*/, "")})</span>
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {language === "gu" ? "તૈયાર થવામાં:" : language === "hi" ? "तैयार होने में:" : "Ready in"}
                </span>
                <strong
                  style={{
                    color: "var(--accent)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                    fontSize: 13.5,
                  }}
                >
                  {formatCountdown(secondsLeft)}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>
                  ({readyTimeFormatted || etaText.replace(/^⏱\s*/, "")})
                </span>
              </span>
            )}

            {onOpenCustomTime && (
              <span style={{ fontSize: 11, color: "var(--accent)", marginLeft: 2 }} title="Edit Scheduled Time">
                ✎
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              maxWidth: 340,
              margin: "0 auto 10px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={sanitizeDisplayFileName(fileName)}
          >
            {sanitizeDisplayFileName(fileName)} · {pages} {pages === 1 ? "pg" : "pgs"} ({colour ? "Colour" : "B&W"})
          </div>

          {/* Payment Method & Status Badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            {isCash ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 13px",
                  background: "rgba(244, 215, 121, 0.12)",
                  border: "1px solid rgba(244, 215, 121, 0.35)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                }}
              >
                <span style={{ fontSize: 13 }}>💵</span>
                <span>
                  {language === "gu"
                    ? `કાઉન્ટર પર રોકડ: ₹${amount.toFixed(2)} ચૂકવવાના બાકી`
                    : language === "hi"
                    ? `काउंटर पर नकद: ₹${amount.toFixed(2)} देय`
                    : `Pay Cash at Counter · ₹${amount.toFixed(2)} Due`}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 13px",
                  background: "rgba(167, 232, 189, 0.12)",
                  border: "1px solid rgba(167, 232, 189, 0.35)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--status-ready)",
                }}
              >
                <span style={{ fontSize: 12 }}>✓</span>
                <span>
                  {language === "gu"
                    ? `UPI દ્વારા ચૂકવેલ · ₹${amount.toFixed(2)}`
                    : language === "hi"
                    ? `UPI द्वारा भुगतान सफल · ₹${amount.toFixed(2)}`
                    : `Paid Online via UPI · ₹${amount.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide 2: Counter Verification QR Code */}
      {activeTab === "qr" && (
        <div style={{ animation: "fadeIn 200ms ease", padding: "4px 0" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>{getTranslation(language, "counter_qr")}</span>
            <span
              style={{
                fontSize: 10,
                color: isCash ? "var(--accent)" : "var(--status-ready)",
                background: isCash ? "rgba(244, 215, 121, 0.12)" : "rgba(167, 232, 189, 0.12)",
                padding: "2px 8px",
                borderRadius: 999,
                border: `1px solid ${isCash ? "rgba(244, 215, 121, 0.3)" : "rgba(167, 232, 189, 0.25)"}`,
                fontWeight: 700,
              }}
            >
              {isCash ? `💵 Cash: ₹${amount.toFixed(2)} Due` : `✓ Paid: ₹${amount.toFixed(2)}`}
            </span>
          </div>

          {/* Central Real Scannable QR Code Container */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 12,
              display: "inline-block",
              margin: "0 auto 12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            }}
          >
            <RealQRCode
              value={`PHTOPY://VERIFY?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(orderRef)}&status=${encodeURIComponent(statusText)}`}
              size={130}
              alt={`Verification QR code for order ${orderRef}`}
            />
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
            {getTranslation(language, "scan_at_counter")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 260, margin: "0 auto 8px", lineHeight: 1.35 }}>
            {language === "gu"
              ? `કાઉન્ટર સ્ટાફ ટોકન ${token} માટે આ QR કોડ સ્કેન કરીને પ્રિન્ટ સોંપશે.`
              : language === "hi"
              ? `काउंटर स्टाफ टोकन ${token} के लिए यह क्यूआर कोड स्कैन करके प्रिंट सौंपेंगे।`
              : `Staff will scan this QR at Central Counter to hand over verified prints for token ${token}.`}
          </div>
        </div>
      )}

      {/* Bottom swipe guide bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 8,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "token" ? "qr" : "token")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {activeTab === "token" ? (language === "gu" ? "QR કોડ બતાવો →" : language === "hi" ? "क्यूआर कोड दिखाएं →" : "Show QR Code →") : (language === "gu" ? "← ટોકન બતાવો" : language === "hi" ? "← टोकन दिखाएं" : "← Show Token")}
        </button>

        {/* Indicator dots */}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span
            style={{
              width: activeTab === "token" ? 14 : 6,
              height: 6,
              borderRadius: 3,
              background: activeTab === "token" ? "var(--accent)" : "rgba(255,255,255,0.2)",
              transition: "all 150ms ease",
            }}
          />
          <span
            style={{
              width: activeTab === "qr" ? 14 : 6,
              height: 6,
              borderRadius: 3,
              background: activeTab === "qr" ? "var(--accent)" : "rgba(255,255,255,0.2)",
              transition: "all 150ms ease",
            }}
          />
        </div>

        <span style={{ fontSize: 10 }}>
          {language === "gu" ? "ડાબે/જમણે સ્વાઇપ કરો" : language === "hi" ? "बाएं/दाएं स्वाइप करें" : "Swipe left/right"}
        </span>
      </div>
    </div>
  );
}

export default UnifiedTokenSwipeCard;
