import React, { useState, useEffect, useCallback } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Global reference for prompt across app
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(globalDeferredPrompt));
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standaloneCheck =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");
    setIsStandalone(Boolean(standaloneCheck));

    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(Boolean(iosCheck));

    const handler = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "ios" | "unavailable"> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
      return choice.outcome;
    }
    if (isIOS) {
      return "ios";
    }
    return "unavailable";
  }, [deferredPrompt, isIOS]);

  return {
    isInstallable: Boolean(deferredPrompt) || (isIOS && !isStandalone),
    isStandalone,
    isIOS,
    promptInstall,
  };
}

interface InstallAppPromptProps {
  language?: SupportedLanguage;
  onInstalled?: () => void;
}

export function InstallAppPrompt({ language = "en", onInstalled }: InstallAppPromptProps) {
  const { isStandalone, isIOS, promptInstall } = usePwaInstall();
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isIOSModalOpen, setIsIOSModalOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone) return;

    // Check if dismissed recently (within 12 hours)
    try {
      const dismissedTime = localStorage.getItem("printq_install_dismissed_time");
      if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 12 * 60 * 60 * 1000) {
        setHasDismissed(true);
        return;
      }
    } catch {}

    // Show after 1.5 seconds on mobile/web
    const timer = setTimeout(() => {
      setIsBannerVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isStandalone]);

  const handleDismiss = () => {
    setIsBannerVisible(false);
    setHasDismissed(true);
    try {
      localStorage.setItem("printq_install_dismissed_time", Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setIsBannerVisible(false);
      if (onInstalled) onInstalled();
    } else if (outcome === "ios") {
      setIsIOSModalOpen(true);
    } else if (outcome === "unavailable") {
      // In case beforeinstallprompt hasn't fired yet or browser requires manual step
      if (isIOS) {
        setIsIOSModalOpen(true);
      } else {
        alert(
          language === "gu"
            ? "તમારા બ્રાઉઝર મેનૂ (⋮) માં 'Install app' અથવા 'Add to Home screen' પસંદ કરો."
            : language === "hi"
            ? "अपने ब्राउज़र मेनू (⋮) में 'Install app' या 'Add to Home screen' चुनें।"
            : "In your browser menu (⋮), tap 'Install app' or 'Add to Home screen'."
        );
      }
    }
  };

  if (isStandalone || !isBannerVisible || hasDismissed) {
    return isIOSModalOpen ? renderIOSModal() : null;
  }

  function renderIOSModal() {
    return (
      <div
        className="modal-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          animation: "fadeIn 200ms ease",
        }}
        onClick={() => setIsIOSModalOpen(false)}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            borderTop: "2px solid var(--accent)",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: "24px 20px 32px",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
            animation: "slideUp 250ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--accent-tint)",
                  border: "1px solid var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🖨️
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
                {getTranslation(language, "install_app_ios_title")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsIOSModalOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 20,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "16px 0 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: "var(--surface-raised)",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60A5FA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ⎋
              </div>
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
                {getTranslation(language, "install_app_ios_step1")}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: "var(--surface-raised)",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(244, 215, 121, 0.15)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ➕
              </div>
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
                {getTranslation(language, "install_app_ios_step2")}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: "var(--surface-raised)",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(167, 232, 189, 0.15)",
                  color: "var(--status-ready)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
                {getTranslation(language, "install_app_ios_step3")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsIOSModalOpen(false)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {language === "gu" ? "સમજાયું" : language === "hi" ? "समझ गया" : "Got it!"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="mobile-install-app-banner"
        style={{
          position: "fixed",
          bottom: "calc(var(--nav-height, 64px) + 12px)",
          left: 12,
          right: 12,
          maxWidth: 440,
          margin: "0 auto",
          zIndex: 85,
          background: "var(--surface)",
          border: "1.5px solid var(--accent)",
          borderRadius: 18,
          padding: "14px 16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.65), 0 0 16px rgba(244, 215, 121, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: "slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(244, 215, 121, 0.2) 0%, rgba(244, 215, 121, 0.05) 100%)",
                border: "1.5px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(244, 215, 121, 0.25)",
              }}
            >
              🖨️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                  {getTranslation(language, "install_app_title")}
                </h4>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "var(--accent-tint)",
                    border: "1px solid rgba(244, 215, 121, 0.3)",
                    padding: "1px 6px",
                    borderRadius: 4,
                    textTransform: "uppercase",
                  }}
                >
                  PWA
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.35 }}>
                {getTranslation(language, "install_app_desc")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss Install Banner"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: 16,
              cursor: "pointer",
              padding: "2px 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              flex: "0 0 auto",
              padding: "8px 14px",
              borderRadius: 10,
              background: "var(--surface-raised)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {getTranslation(language, "install_app_later")}
          </button>

          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 10,
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: "none",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 2px 10px rgba(244, 215, 121, 0.3)",
              transition: "transform 120ms ease",
            }}
          >
            <span>⬇️</span>
            <span>{getTranslation(language, "install_app_btn")}</span>
          </button>
        </div>
      </div>

      {isIOSModalOpen && renderIOSModal()}
    </>
  );
}

export default InstallAppPrompt;

