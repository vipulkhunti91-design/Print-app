import React, { useState } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";
import type { ActiveOrder } from "../data/demoData";

interface HomeShortcutsProps {
  language: SupportedLanguage;
  go: (screen: any) => void;
  activeOrder: ActiveOrder | null;
  nowServing: { token: string; status: string; fileName?: string } | null;
  onSelectShortcut: (tool: "bw" | "deadline" | "group" | "language") => void;
}

export function HomeShortcuts({
  language,
  go,
  activeOrder,
  nowServing,
  onSelectShortcut,
}: HomeShortcutsProps) {
  const [activeModal, setActiveModal] = useState<"bw" | "deadline" | "group" | null>(null);

  return (
    <section className="home-shortcuts-section" style={{ width: "100%", margin: "16px 0 20px" }}>
      {/* Shared Queue Live Status Bar: User Pickup Token & Now Serving */}
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
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <div>
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
            <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>
              {nowServing?.token ? `Token ${nowServing.token}` : "Counter Idle · No Queue"}
            </strong>
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
          <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
            Campus Counter A-2
          </span>
        )}
      </div>

      {/* Clean 4-Tool Shortcuts Grid */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          {getTranslation(language, "home_shortcuts_title")}
        </h2>
      </div>

      <div
        className="home-shortcuts-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        {/* Shortcut 1: B&W Legibility */}
        <button
          type="button"
          className="home-shortcut-card"
          onClick={() => {
            onSelectShortcut("bw");
            setActiveModal("bw");
          }}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            transition: "all 140ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(244, 215, 121, 0.1)", padding: "2px 6px", borderRadius: 4 }}>
              Tool
            </span>
          </div>
          <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>
            {getTranslation(language, "shortcut_bw_preview")}
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
            {getTranslation(language, "shortcut_bw_desc")}
          </span>
        </button>

        {/* Shortcut 2: Deadline Check */}
        <button
          type="button"
          className="home-shortcut-card"
          onClick={() => {
            onSelectShortcut("deadline");
            setActiveModal("deadline");
          }}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            transition: "all 140ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 20 }}>⏱</span>
            <span style={{ fontSize: 10, color: "var(--status-ready)", fontWeight: 700, background: "rgba(167, 232, 189, 0.1)", padding: "2px 6px", borderRadius: 4 }}>
              Queue
            </span>
          </div>
          <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>
            {getTranslation(language, "shortcut_deadline_check")}
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
            {getTranslation(language, "shortcut_deadline_desc")}
          </span>
        </button>

        {/* Shortcut 3: Group Printing */}
        <button
          type="button"
          className="home-shortcut-card"
          onClick={() => {
            onSelectShortcut("group");
            setActiveModal("group");
          }}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            transition: "all 140ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(244, 215, 121, 0.1)", padding: "2px 6px", borderRadius: 4 }}>
              Split
            </span>
          </div>
          <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>
            {getTranslation(language, "shortcut_group_print")}
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
            {getTranslation(language, "shortcut_group_desc")}
          </span>
        </button>

        {/* Shortcut 4: Language Settings */}
        <button
          type="button"
          className="home-shortcut-card"
          onClick={() => {
            onSelectShortcut("language");
            go("settings");
          }}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            transition: "all 140ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 20 }}>🌐</span>
            <span style={{ fontSize: 10, color: "var(--text)", fontWeight: 700, background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: 4 }}>
              {language.toUpperCase()}
            </span>
          </div>
          <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>
            {getTranslation(language, "shortcut_language")}
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
            {getTranslation(language, "shortcut_language_desc")}
          </span>
        </button>
      </div>

      {/* Interactive Tool Modal: B&W Legibility Quick Overview */}
      {activeModal === "bw" && (
        <div
          className="payment-modal-overlay"
          style={{ zIndex: 130 }}
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="payment-modal-card"
            style={{ maxWidth: 360, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: "var(--text)" }}>🔍 B&W Legibility Checker</strong>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, margin: "0 0 12px" }}>
              Upload any document on the Home screen to automatically analyze grayscale readability, contrast levels, and low-contrast chart labels.
            </p>
            <div style={{ background: "rgba(244, 215, 121, 0.08)", border: "1px solid rgba(244, 215, 121, 0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, display: "block" }}>
                ✓ Embedded in Print Settings
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                When you select B&W mode, PrintQ flags pages with potentially hard-to-read elements so you can review before paying.
              </span>
            </div>
            <button
              type="button"
              className="bill-pay-btn"
              style={{ width: "100%", height: 42, fontSize: 13 }}
              onClick={() => {
                setActiveModal(null);
                document.getElementById("printq-upload-file")?.click();
              }}
            >
              Upload Document to Test
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tool Modal: Deadline Estimator Quick Overview */}
      {activeModal === "deadline" && (
        <div
          className="payment-modal-overlay"
          style={{ zIndex: 130 }}
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="payment-modal-card"
            style={{ maxWidth: 360, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: "var(--text)" }}>⏱ Deadline Estimator</strong>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, margin: "0 0 12px" }}>
              Check your class, lab, or exam submission deadline against the real shop queue capacity (9:30 AM – 5:00 PM Mon–Fri).
            </p>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Current Turnaround</span>
                <strong style={{ fontSize: 12, color: "var(--status-ready)" }}>~15 minutes</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Shop Capacity Status</span>
                <strong style={{ fontSize: 12, color: "var(--accent)" }}>Normal Flow</strong>
              </div>
            </div>
            <button
              type="button"
              className="bill-pay-btn"
              style={{ width: "100%", height: 42, fontSize: 13 }}
              onClick={() => {
                setActiveModal(null);
                document.getElementById("printq-upload-file")?.click();
              }}
            >
              Start Order with Deadline Check
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tool Modal: Group Printing Overview */}
      {activeModal === "group" && (
        <div
          className="payment-modal-overlay"
          style={{ zIndex: 130 }}
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="payment-modal-card"
            style={{ maxWidth: 360, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: "var(--text)" }}>👥 Group Cost Settlement</strong>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, margin: "0 0 12px" }}>
              Print project submissions, club posters, or group study notes together. The organizer invites members and PrintQ calculates each member's share with verified UPI settlement.
            </p>
            <div style={{ background: "rgba(244, 215, 121, 0.08)", border: "1px solid rgba(244, 215, 121, 0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, display: "block" }}>
                ✓ Unified Settlement & Separate Receipts
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                Each group member pays their own exact share via UPI without manual calculations.
              </span>
            </div>
            <button
              type="button"
              className="bill-pay-btn"
              style={{ width: "100%", height: 42, fontSize: 13 }}
              onClick={() => {
                setActiveModal(null);
                go("checkout");
              }}
            >
              Go to Checkout to Split
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

