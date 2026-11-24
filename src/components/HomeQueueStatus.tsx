import { useState, useEffect } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";
import { getShopStatus } from "../config/shopHours";
import { printQueueManager, type QueueOrder } from "../services/printQueueService";

interface HomeQueueStatusProps {
  language: SupportedLanguage;
  go?: (screen: any) => void;
  userAuthenticated?: boolean;
  activeOrder?: ActiveOrder | null;
  activeOrders?: ActiveOrder[];
  nowServing: { token: string; status: string; fileName?: string } | null;
}

export function HomeQueueStatus({
  language,
  go,
  userAuthenticated = false,
  activeOrder,
  activeOrders = [],
  nowServing,
}: HomeQueueStatusProps) {
  const [shopStatus, setShopStatus] = useState(getShopStatus);
  const [, setQueueVersion] = useState(0);

  // Subscribe to printQueueManager for instant real-time sync across windows/tabs
  useEffect(() => {
    const unsub = printQueueManager.subscribe(() => {
      setQueueVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // 1-second timer to update shop status & countdown timers in real time
  useEffect(() => {
    const timer = window.setInterval(() => {
      setShopStatus(getShopStatus());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isOpen = shopStatus.state === "open" || shopStatus.state === "closing-soon";
  const liveQueue = printQueueManager.getQueue();
  const liveNowServing = nowServing || printQueueManager.getNowServing();

  // 1. Currently Serving Token
  const currentServingToken = liveNowServing?.token || "D-14";
  const currentServingStatus = liveNowServing?.status || "Printing";

  // 2. Next in Line Token Calculation
  // Find earliest order with status 'waiting'
  const waitingOrders = liveQueue.filter((q) => q.status === "waiting");
  let nextTokenNumber = "None";
  if (waitingOrders.length > 0) {
    nextTokenNumber = waitingOrders[0].token;
  } else {
    // If no waiting order currently in queue, predict next sequential token
    const parts = currentServingToken.split("-");
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      nextTokenNumber = `${parts[0]}-${Number(parts[1]) + 1}`;
    } else {
      nextTokenNumber = "P-15";
    }
  }

  // 3. User's Active Order & Estimated Wait Time (Strictly scoped to logged-in user)
  const primaryActiveOrder = userAuthenticated
    ? (activeOrder || activeOrders.find((o) => o && o.status !== "completed" && o.status !== "cancelled") || null)
    : null;

  const userActiveToken = primaryActiveOrder?.token;
  const userQueueMetrics = printQueueManager.getQueueMetricsForToken(userActiveToken);

  // Determine user status label & color
  const getUserStatusDisplay = () => {
    if (!primaryActiveOrder) return null;
    const status = primaryActiveOrder.status;
    if (status === "ready" || status === "pickup") {
      return {
        text: language === "gu" ? "તૈયાર છે" : language === "hi" ? "तैयार है" : "Ready for Pickup",
        badgeColor: "var(--status-ready)",
        badgeBg: "rgba(167, 232, 189, 0.14)",
        badgeBorder: "rgba(167, 232, 189, 0.35)",
        isReady: true,
      };
    }
    if (status === "printing") {
      return {
        text: language === "gu" ? "પ્રિન્ટિંગ ચાલુ છે" : language === "hi" ? "प्रिंटिंग जारी है" : "Printing in Progress",
        badgeColor: "var(--status-processing)",
        badgeBg: "rgba(143, 163, 255, 0.14)",
        badgeBorder: "rgba(143, 163, 255, 0.35)",
        isReady: false,
      };
    }
    // Queued / waiting
    const ordersAhead = userQueueMetrics.ordersAhead;
    const aheadText = ordersAhead > 0 ? ` (${ordersAhead} ahead)` : "";
    return {
      text: (language === "gu" ? "કતારમાં છે" : language === "hi" ? "कतार में" : "In Queue") + aheadText,
      badgeColor: "var(--status-pending)",
      badgeBg: "rgba(251, 146, 60, 0.14)",
      badgeBorder: "rgba(251, 146, 60, 0.35)",
      isReady: false,
    };
  };

  const userStatusDisplay = getUserStatusDisplay();

  return (
    <section
      className="home-queue-status-widget"
      aria-label="Live Token Status and Queue Board"
      style={{
        width: "100%",
        margin: "12px 0 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Top Header Pill: Live Counter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: isOpen ? "var(--status-ready)" : "var(--error)",
              boxShadow: isOpen ? "0 0 8px var(--status-ready)" : "none",
            }}
          />
          <span style={{ color: isOpen ? "var(--text)" : "var(--error)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {isOpen ? "LIVE QUEUE BOARD" : "COUNTER CLOSED"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
          <span>{isOpen ? "Campus Counter A-2" : (shopStatus.nextOpeningText || "Opens 9:30 AM")}</span>
        </div>
      </div>

      {/* Main Dual Token Cards: "Now Serving" & "Next Token" */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          width: "100%",
        }}
      >
        {/* Card 1: Currently Serving */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {language === "gu" ? "હાલ સેવા આપે છે" : language === "hi" ? "वर्तमान सेवा" : "Now Serving"}
            </span>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 6px var(--accent)",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--accent)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: "2px",
            }}
          >
            {currentServingToken}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                backgroundColor: "var(--surface-raised)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "inline-block",
              }}
            >
              {isOpen ? `🖨️ ${currentServingStatus}` : "🌙 Closed"}
            </span>
          </div>
        </div>

        {/* Card 2: Next in Line Token */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {language === "gu" ? "આગામી ટોકન" : language === "hi" ? "अगला टोकन" : "Next in Line"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--cool-support)" }}>⏳</span>
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: "2px",
            }}
          >
            {nextTokenNumber}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 600,
                color: "var(--cool-support)",
                backgroundColor: "rgba(143, 163, 255, 0.12)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "inline-block",
              }}
            >
              Up Next
            </span>
          </div>
        </div>
      </div>

      {/* User's Active Token Status & Estimated Waiting Time Banner */}
      {primaryActiveOrder ? (
        <div
          onClick={() => go?.("token")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") go?.("token");
          }}
          aria-label={`Your token is ${primaryActiveOrder.token}. Tap to view order and QR details.`}
          style={{
            backgroundColor: "var(--surface)",
            border: userStatusDisplay?.isReady
              ? "1.5px solid var(--status-ready)"
              : "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            cursor: "pointer",
            transition: "background-color 140ms ease, transform 120ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-raised)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            {/* Token Badge */}
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                backgroundColor: "var(--accent-tint)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: "15px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              {primaryActiveOrder.token}
            </div>

            {/* Token Status Info */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Your Active Token
                </span>
                {userStatusDisplay && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: userStatusDisplay.badgeColor,
                      backgroundColor: userStatusDisplay.badgeBg,
                      border: `1px solid ${userStatusDisplay.badgeBorder}`,
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {userStatusDisplay.text}
                  </span>
                )}
              </div>

              {/* Waiting time display */}
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: userStatusDisplay?.isReady ? "var(--status-ready)" : "var(--text)",
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>
                  {userStatusDisplay?.isReady
                    ? "🎉 Ready for pickup now at Counter"
                    : `Estimated Wait: ${userQueueMetrics.waitFormatted}`}
                </span>
              </div>
            </div>
          </div>

          {/* Action chevron / Track button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go?.("token");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--surface-raised)",
              color: "var(--accent)",
              border: "1px solid var(--border)",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Track →
          </button>
        </div>
      ) : (
        /* No active token state: Clean prompt with live queue estimate */
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>🎫</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text)", display: "block" }}>
                Your Active Token: <span style={{ color: "var(--text-muted)" }}>None</span>
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>
                Upload files below for instant token · Avg wait ~3 mins
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 600,
              color: "var(--status-ready)",
              backgroundColor: "rgba(167, 232, 189, 0.12)",
              border: "1px solid rgba(167, 232, 189, 0.25)",
              padding: "2px 8px",
              borderRadius: "6px",
              flexShrink: 0,
            }}
          >
            Fast Queue
          </span>
        </div>
      )}
    </section>
  );
}

export default HomeQueueStatus;
