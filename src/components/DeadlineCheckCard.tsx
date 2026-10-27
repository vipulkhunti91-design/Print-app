import React, { useState } from "react";
import type { CompletionEstimate } from "../utils/estimatedTime";

interface DeadlineCheckCardProps {
  currentEstimate: CompletionEstimate;
  onDeadlineSelected?: (deadlineMinutes: number) => void;
}

export function DeadlineCheckCard({
  currentEstimate,
  onDeadlineSelected,
}: DeadlineCheckCardProps) {
  // Preset deadlines in minutes from now
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(30);

  const presets = [
    { label: "In 15m", minutes: 15 },
    { label: "In 30m", minutes: 30 },
    { label: "In 1 hr", minutes: 60 },
    { label: "In 2 hrs", minutes: 120 },
    { label: "End of Day (5 PM)", minutes: 240 },
  ];

  const estimatedReadyMinutes = currentEstimate.minutes || 15;
  const isLikelyToMeet = selectedMinutes ? estimatedReadyMinutes <= selectedMinutes : true;
  const isCloseCall = selectedMinutes ? Math.abs(estimatedReadyMinutes - selectedMinutes) <= 5 : false;

  return (
    <div
      className="deadline-check-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 14px",
        margin: "12px 0",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>⏱</span>
          <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            Pickup Deadline Check
          </strong>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isLikelyToMeet ? "var(--status-ready)" : "#F43F5E",
            background: isLikelyToMeet ? "rgba(167, 232, 189, 0.12)" : "rgba(244, 63, 94, 0.12)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          {selectedMinutes
            ? isLikelyToMeet
              ? isCloseCall
                ? "Tight Fit (Risk)"
                : "✓ Meets Deadline"
              : "⚠️ May Miss Deadline"
            : "Select Deadline"}
        </span>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.35 }}>
        Choose when you need this print ready. Calculated using current queue load and shop operating hours (Mon–Fri: 9:30 AM – 5:00 PM).
      </p>

      {/* Preset Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {presets.map((p) => {
          const isActive = selectedMinutes === p.minutes;
          return (
            <button
              key={p.minutes}
              type="button"
              onClick={() => {
                setSelectedMinutes(p.minutes);
                onDeadlineSelected?.(p.minutes);
              }}
              style={{
                background: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.06)",
                color: isActive ? "#0A0A0A" : "var(--text)",
                border: "1px solid",
                borderColor: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Real vs Approximate Status Clarification */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px",
          background: "rgba(0, 0, 0, 0.3)",
          borderRadius: 8,
          fontSize: 11.5,
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          Calculated Ready: <strong style={{ color: "var(--text)" }}>{currentEstimate.readyTimeFormatted}</strong>
        </span>
        <span style={{ color: currentEstimate.isQueueAvailable ? "var(--accent)" : "var(--text-muted)", fontSize: 11 }}>
          {currentEstimate.isQueueAvailable ? "● Live Queue Synced" : "○ Approximate Model (Offline)"}
        </span>
      </div>
    </div>
  );
}
