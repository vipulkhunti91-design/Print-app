import { useState, useEffect } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";
import { printQueueManager, type QueueOrder } from "../services/printQueueService";

interface HomeQueueStatusProps {
  language: SupportedLanguage;
  go: (screen: any) => void;
  activeOrder: ActiveOrder | null;
  nowServing: { token: string; status: string; fileName?: string } | null;
}

export function HomeQueueStatus({
  language,
  go,
  activeOrder,
  nowServing,
}: HomeQueueStatusProps) {
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const [queueList, setQueueList] = useState<QueueOrder[]>(() => printQueueManager.getQueue());
  
  // Real-time page printing progress simulation (1 to 8 pages)
  const [printedPage, setPrintedPage] = useState(4);
  const totalDocPages = 8;
  const progressPercent = Math.min(100, Math.round((printedPage / totalDocPages) * 100));

  // Subscribe to live queue updates
  useEffect(() => {
    const unsub = printQueueManager.subscribe((q) => {
      setQueueList(q);
    });
    return unsub;
  }, []);

  // Tick print progress so user visually sees the token actively working
  useEffect(() => {
    const interval = setInterval(() => {
      setPrintedPage((prev) => {
        if (prev >= totalDocPages) {
          // Reset to 1 to simulate next job in line
          return 1;
        }
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [totalDocPages]);

  // Determine current active token
  const activeServing = nowServing?.token || queueList.find(q => q.status === "printing")?.token || "D-14";
  const isReady = nowServing?.status === "Ready for Pickup";
  const waitingOrders = queueList.filter((q) => q.status === "waiting");
  const estimatedWaitMinutes = Math.max(2, (waitingOrders.length + 1) * 3);

  return (
    <section className="home-queue-status" style={{ width: "100%", margin: "16px 0 20px" }}>
      <div
        className="home-serving-pill-card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle top animated laser scanning beam */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, var(--accent), var(--status-ready), transparent)",
            opacity: 0.8,
          }}
        />

        {/* Top Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 800,
                color: "var(--text-secondary)",
              }}
            >
              {getTranslation(language, "home_now_serving")}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(167, 232, 189, 0.15)",
                color: "var(--status-ready)",
                border: "1px solid rgba(167, 232, 189, 0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--status-ready)",
                  boxShadow: "0 0 8px var(--status-ready)",
                  display: "inline-block",
                }}
              />
              LIVE COUNTER
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Campus Counter A-2
            </span>
          </div>
        </div>

        {/* Main Token & Status Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(244, 215, 121, 0.12)",
                border: "1px solid rgba(244, 215, 121, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(244, 215, 121, 0.15)",
              }}
            >
              🖨️
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <strong
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--accent)",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                  }}
                >
                  Token {activeServing}
                </strong>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isReady ? "var(--status-ready)" : "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {isReady ? "🎉 Ready for Pickup" : `📄 Printing · Page ${printedPage}/${totalDocPages}`}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                Printer #1 (HP LaserJet Enterprise) · High Speed
              </div>
            </div>
          </div>

          {/* Active Order or Details Toggle */}
          {activeOrder ? (
            <button
              type="button"
              onClick={() => go("token")}
              style={{
                background: "rgba(167, 232, 189, 0.15)",
                border: "1px solid rgba(167, 232, 189, 0.4)",
                borderRadius: 10,
                padding: "8px 12px",
                minHeight: 44,
                display: "inline-flex",
                flexDirection: "column",
                justifyContent: "center",
                flexShrink: 0,
                textAlign: "right",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              aria-label="View Active Order"
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-ready)", display: "block" }}>
                {getTranslation(language, "home_your_pickup_token")}
              </span>
              <strong style={{ fontSize: 15, fontWeight: 900, color: "var(--status-ready)" }}>
                {activeOrder.token} →
              </strong>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowQueueDetails((prev) => !prev)}
              style={{
                background: showQueueDetails ? "rgba(244, 215, 121, 0.15)" : "rgba(255, 255, 255, 0.05)",
                border: showQueueDetails ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: 10,
                padding: "6px 10px",
                color: showQueueDetails ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
              aria-expanded={showQueueDetails}
            >
              <span>Queue ({waitingOrders.length + 1})</span>
              <span>{showQueueDetails ? "▴" : "▾"}</span>
            </button>
          )}
        </div>

        {/* Live Animated Progress Bar */}
        <div style={{ width: "100%", marginTop: 2 }}>
          <div
            style={{
              width: "100%",
              height: 4,
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.08)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent) 0%, var(--status-ready) 100%)",
                borderRadius: 999,
                transition: "width 0.4s ease-in-out",
                boxShadow: "0 0 8px rgba(244, 215, 121, 0.5)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            <span>Printing speed: 28 ppm</span>
            <span>Est. Wait: ~{estimatedWaitMinutes} mins · {waitingOrders.length} ahead in queue</span>
          </div>
        </div>

        {/* Collapsible Live Queue Breakdown */}
        {showQueueDetails && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 10,
              borderTop: "1px dashed rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
              Live Campus Queue (FIFO)
            </div>
            
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(244, 215, 121, 0.08)",
                border: "1px solid rgba(244, 215, 121, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12 }}>🖨️</span>
                <div>
                  <strong style={{ fontSize: 12, color: "var(--accent)" }}>Token {activeServing}</strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 6 }}>
                    · Printing Now (Page {printedPage}/{totalDocPages})
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>Now</span>
            </div>

            {waitingOrders.length > 0 ? (
              waitingOrders.slice(0, 3).map((order, idx) => (
                <div
                  key={order.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12 }}>⏳</span>
                    <div>
                      <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>Token {order.token}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                        · {order.totalPages} pages {order.colour ? "(Colour)" : "(B&W)"}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    ~{(idx + 1) * 3} mins
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>⏳</span>
                  <div>
                    <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>Token K-08</strong>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                      · Next in line (5 pages)
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>~3 mins</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
