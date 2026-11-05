import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";

interface HomeQueueStatusProps {
  language: SupportedLanguage;
  go?: (screen: any) => void;
  activeOrder?: ActiveOrder | null;
  nowServing: { token: string; status: string; fileName?: string } | null;
}

export function HomeQueueStatus({
  language,
  nowServing,
}: HomeQueueStatusProps) {
  // Always display one active token number only, without extra print details
  const tokenNumber = nowServing?.token || "D-14";

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
            <strong
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--accent)",
                display: "block",
                marginTop: 2,
              }}
            >
              Token {tokenNumber}
            </strong>
          </div>
        </div>

        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text-secondary)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 10px",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          Campus Counter A-2
        </span>
      </div>
    </section>
  );
}
