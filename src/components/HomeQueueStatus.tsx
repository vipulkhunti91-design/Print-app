import { useState, useEffect } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";
import { getShopStatus } from "../config/shopHours";

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
  const [shopStatus, setShopStatus] = useState(getShopStatus);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShopStatus(getShopStatus());
    }, 15000); // 15-second real-time sync
    return () => window.clearInterval(timer);
  }, []);

  const isOpen = shopStatus.state === "open" || shopStatus.state === "closing-soon";
  const tokenNumber = nowServing?.token || "D-14";

  return (
    <section className="home-queue-status" style={{ width: "100%", margin: "16px 0 20px" }}>
      <div
        className="home-serving-pill-card"
        style={{
          background: "var(--surface)",
          border: `1px solid ${isOpen ? "var(--border)" : "rgba(248, 113, 113, 0.25)"}`,
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
              background: isOpen ? "rgba(244, 215, 121, 0.12)" : "rgba(248, 113, 113, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {isOpen ? "📢" : "🌙"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: isOpen ? "var(--text-secondary)" : "var(--error)",
                display: "block",
              }}
            >
              {isOpen
                ? getTranslation(language, "home_now_serving")
                : (language === "gu" ? "કાઉન્ટર બંધ છે" : language === "hi" ? "काउंटर बंद है" : "Counter Closed")}
            </span>
            <strong
              style={{
                fontSize: isOpen ? 16 : 14,
                fontWeight: 800,
                color: isOpen ? "var(--accent)" : "var(--text)",
                display: "block",
                marginTop: 2,
              }}
            >
              {isOpen
                ? `Token ${tokenNumber}`
                : (language === "gu"
                    ? (shopStatus.nextOpeningText?.includes("Monday") ? "સોમવારે સવારે 9:30 વાગ્યે ખુલશે" : "આવતીકાલે સવારે 9:30 વાગ્યે ખુલશે")
                    : language === "hi"
                    ? (shopStatus.nextOpeningText?.includes("Monday") ? "सोमवार सुबह 9:30 बजे खुलेगा" : "कल सुबह 9:30 बजे खुलेगा")
                    : (shopStatus.nextOpeningText || "Opens tomorrow at 9:30 AM"))}
            </strong>
          </div>
        </div>

        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: isOpen ? "var(--text-secondary)" : "var(--error)",
            background: isOpen ? "var(--surface-raised)" : "rgba(248, 113, 113, 0.12)",
            border: `1px solid ${isOpen ? "var(--border)" : "rgba(248, 113, 113, 0.25)"}`,
            borderRadius: 8,
            padding: "4px 10px",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {isOpen ? "Campus Counter A-2" : (language === "gu" ? "બંધ છે" : language === "hi" ? "बंद है" : "Closed")}
        </span>
      </div>
    </section>
  );
}
