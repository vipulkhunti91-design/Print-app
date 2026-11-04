import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";

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
  return (
    <section className="home-queue-status" style={{ width: "100%", margin: "16px 0 20px" }}>
      <div
        className="home-serving-pill-card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(244, 215, 121, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            📢
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
              }}
            >
              {getTranslation(language, "home_now_serving")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: nowServing?.status === "Ready for Pickup" ? "var(--status-ready)" : "var(--accent)",
                  boxShadow: nowServing?.status === "Ready for Pickup" ? "0 0 8px rgba(167, 232, 189, 0.7)" : "0 0 8px rgba(244, 215, 121, 0.7)",
                  display: "inline-block",
                }}
              />
              <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>
                Token {nowServing?.token || "D-14"}
              </strong>
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                · {nowServing?.status === "Ready for Pickup" ? "Ready at Counter" : "Printing now…"}
              </span>
            </div>
          </div>
        </div>

        {activeOrder ? (
          <button
            type="button"
            onClick={() => go("token")}
            style={{
              background: "rgba(167, 232, 189, 0.12)",
              border: "1px solid rgba(167, 232, 189, 0.3)",
              borderRadius: 10,
              padding: "6px 10px",
              minHeight: 44,
              display: "inline-flex",
              flexDirection: "column",
              justifyContent: "center",
              flexShrink: 0,
              textAlign: "right",
              cursor: "pointer",
            }}
            aria-label="View Active Order"
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-ready)", display: "block" }}>
              {getTranslation(language, "home_your_pickup_token")}
            </span>
            <strong style={{ fontSize: 14, fontWeight: 900, color: "var(--status-ready)" }}>
              {activeOrder.token} →
            </strong>
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-ready)", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--status-ready)" }} />
              LIVE QUEUE
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Campus Counter A-2
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
