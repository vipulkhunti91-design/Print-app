import React, { useState } from "react";
import type { SupportedLanguage } from "../utils/i18n";
import { getTranslation } from "../utils/i18n";

interface CustomPickupTimeCardProps {
  defaultReadyFormatted: string;
  defaultMinutes: number;
  customTime: string | null;
  onSelectTime: (formattedTime: string | null) => void;
  language?: SupportedLanguage;
}

export function CustomPickupTimeCard({
  defaultReadyFormatted,
  defaultMinutes,
  customTime,
  onSelectTime,
  language = "en",
}: CustomPickupTimeCardProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Helper to parse time string like "03:48 PM" or "3:48 PM"
  const parseTimeString = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      return {
        hour: parseInt(match[1], 10),
        minute: parseInt(match[2], 10),
        period: (match[3].toUpperCase() === "AM" ? "AM" : "PM") as "AM" | "PM",
      };
    }
    return null;
  };

  // Helper to get default time (e.g. 30 mins from now rounded to next 5 mins)
  const getDefaultTimeParts = () => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const rawHours = d.getHours();
    const period: "AM" | "PM" = rawHours >= 12 ? "PM" : "AM";
    const hour12 = rawHours % 12 || 12;
    const rawMinutes = d.getMinutes();
    const roundedMinutes = Math.ceil(rawMinutes / 5) * 5 % 60;
    return { hour: hour12, minute: roundedMinutes, period };
  };

  const initialParts = customTime ? parseTimeString(customTime) || getDefaultTimeParts() : getDefaultTimeParts();

  const [selectedHour, setSelectedHour] = useState<number>(initialParts.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialParts.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initialParts.period);

  // Quick preset helper
  const getTimeAfterMinutes = (addMins: number): string => {
    const d = new Date(Date.now() + addMins * 60 * 1000);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handleApplyPreset = (addMins: number) => {
    const formatted = getTimeAfterMinutes(addMins);
    onSelectTime(formatted);
    setIsPickerOpen(false);
  };

  const handleResetToAuto = () => {
    onSelectTime(null);
    setIsPickerOpen(false);
  };

  // Steppers
  const incrementHour = () => setSelectedHour((h) => (h === 12 ? 1 : h + 1));
  const decrementHour = () => setSelectedHour((h) => (h === 1 ? 12 : h - 1));

  const incrementMinute = () => setSelectedMinute((m) => (m >= 55 ? 0 : m + 5));
  const decrementMinute = () => setSelectedMinute((m) => (m <= 0 ? 55 : m - 5));

  // Current formatted time from dials
  const currentDialTime = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")} ${selectedPeriod}`;

  // Quick slot click handler
  const setExactSlot = (h: number, m: number, p: "AM" | "PM") => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
  };

  const handleConfirmCustomTime = () => {
    onSelectTime(currentDialTime);
    setIsPickerOpen(false);
  };

  // Shop hours check (shop is 9:30 AM to 5:00 PM)
  const isAfterClosing = (() => {
    if (selectedPeriod === "PM") {
      if (selectedHour === 12) return false; // 12 PM is noon
      if (selectedHour > 5 || (selectedHour === 5 && selectedMinute > 0)) return true;
    }
    if (selectedPeriod === "AM") {
      if (selectedHour < 9 || (selectedHour === 9 && selectedMinute < 30)) return true;
    }
    return false;
  })();

  return (
    <div
      className="custom-pickup-time-card bill-card"
      id="custom-pickup-time-section"
      style={{
        background: "var(--surface)",
        border: customTime ? "1px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 16,
        padding: "14px 16px",
        margin: "0 0 16px",
        boxSizing: "border-box",
        transition: "border-color 150ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🕒</span>
          <div>
            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {getTranslation(language, "scheduled_pickup_time")}
            </h2>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {customTime
                ? (language === "gu" ? "કસ્ટમ પિકઅપ નિર્ધારિત" : language === "hi" ? "कस्टम पिकअप निर्धारित" : "Custom pickup scheduled")
                : (language === "gu" ? `અંદાજિત તૈયાર: આશરે ${defaultReadyFormatted}` : language === "hi" ? `अनुमानित तैयार: लगभग ${defaultReadyFormatted}` : `Estimated ready: around ${defaultReadyFormatted}`)}
            </span>
          </div>
        </div>

        {customTime ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent)",
              background: "var(--accent-tint)",
              border: "1px solid rgba(244, 215, 121, 0.3)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {language === "gu" ? "કસ્ટમ" : language === "hi" ? "कस्टम" : "Custom"}
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--status-ready)",
              background: "rgba(167, 232, 189, 0.12)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {language === "gu" ? "ઝડપથી" : language === "hi" ? "शीघ्र" : "ASAP"}
          </span>
        )}
      </div>

      {/* Preset Quick Chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
        <button
          type="button"
          onClick={handleResetToAuto}
          style={{
            padding: "8px 4px",
            borderRadius: 10,
            border: !customTime ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: !customTime ? "var(--accent-tint)" : "var(--surface-raised)",
            color: !customTime ? "var(--accent)" : "var(--text-secondary)",
            fontSize: 11,
            fontWeight: !customTime ? 700 : 500,
            cursor: "pointer",
            textAlign: "center",
            transition: "all 140ms ease",
          }}
        >
          {getTranslation(language, "asap")}
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset(15)}
          style={{
            padding: "8px 4px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          +15m
        </button>

        <button
          type="button"
          onClick={() => handleApplyPreset(30)}
          style={{
            padding: "8px 4px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          +30m
        </button>

        <button
          type="button"
          onClick={() => {
            const willOpen = !isPickerOpen;
            setIsPickerOpen(willOpen);
            if (willOpen && customTime) {
              const parsed = parseTimeString(customTime);
              if (parsed) {
                setSelectedHour(parsed.hour);
                setSelectedMinute(parsed.minute);
                setSelectedPeriod(parsed.period);
              }
            }
          }}
          style={{
            padding: "8px 4px",
            borderRadius: 10,
            border: isPickerOpen || customTime ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: isPickerOpen || customTime ? "var(--accent-tint)" : "var(--surface-raised)",
            color: isPickerOpen || customTime ? "var(--accent)" : "var(--text)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {customTime ? customTime : "Custom ✎"}
        </button>
      </div>

      {/* App-Native Midnight Gold Time Picker Tray */}
      {isPickerOpen && (
        <div
          className="inapp-time-picker-tray"
          style={{
            marginTop: 14,
            padding: "16px 14px 14px",
            background: "var(--surface-raised)",
            border: "1px solid rgba(244, 215, 121, 0.28)",
            borderRadius: 16,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
            animation: "fadeIn 180ms ease-out",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>
              {getTranslation(language, "set_custom_time")}
            </span>
            <span style={{ fontSize: 10.5, color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>
              Campus Shop: 9:30 AM – 5:00 PM
            </span>
          </div>

          {/* Stepper Digital Clock Widget */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "12px 10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              marginBottom: 14,
            }}
          >
            {/* Hour Dial */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={incrementHour}
                aria-label="Increase Hour"
                style={{
                  width: 48,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 120ms ease",
                }}
              >
                ▲
              </button>
              <div
                style={{
                  width: 54,
                  height: 48,
                  borderRadius: 10,
                  background: "rgba(244, 215, 121, 0.08)",
                  border: "1.5px solid var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  fontSize: 26,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.02em",
                }}
              >
                {String(selectedHour).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={decrementHour}
                aria-label="Decrease Hour"
                style={{
                  width: 48,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ▼
              </button>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em" }}>
                HOUR
              </span>
            </div>

            {/* Glowing Colon */}
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)", marginTop: -14, userSelect: "none" }}>
              :
            </div>

            {/* Minute Dial */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={incrementMinute}
                aria-label="Increase Minute"
                style={{
                  width: 48,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ▲
              </button>
              <div
                style={{
                  width: 54,
                  height: 48,
                  borderRadius: 10,
                  background: "rgba(244, 215, 121, 0.08)",
                  border: "1.5px solid var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  fontSize: 26,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.02em",
                }}
              >
                {String(selectedMinute).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                aria-label="Decrease Minute"
                style={{
                  width: 48,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ▼
              </button>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em" }}>
                MIN
              </span>
            </div>

            {/* AM / PM Segmented Switcher */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "4px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                marginTop: -14,
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedPeriod("AM")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: selectedPeriod === "AM" ? "var(--accent)" : "transparent",
                  color: selectedPeriod === "AM" ? "var(--on-accent)" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: selectedPeriod === "AM" ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 140ms ease",
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod("PM")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: selectedPeriod === "PM" ? "var(--accent)" : "transparent",
                  color: selectedPeriod === "PM" ? "var(--on-accent)" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: selectedPeriod === "PM" ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 140ms ease",
                }}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick slot suggestions for today */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Quick Suggestions for Today:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              <button
                type="button"
                onClick={() => setExactSlot(4, 0, "PM")}
                style={{
                  padding: "6px 4px",
                  borderRadius: 8,
                  border: selectedHour === 4 && selectedMinute === 0 && selectedPeriod === "PM" ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: selectedHour === 4 && selectedMinute === 0 && selectedPeriod === "PM" ? "var(--accent-tint)" : "var(--surface)",
                  color: selectedHour === 4 && selectedMinute === 0 && selectedPeriod === "PM" ? "var(--accent)" : "var(--text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                4:00 PM
              </button>
              <button
                type="button"
                onClick={() => setExactSlot(4, 30, "PM")}
                style={{
                  padding: "6px 4px",
                  borderRadius: 8,
                  border: selectedHour === 4 && selectedMinute === 30 && selectedPeriod === "PM" ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: selectedHour === 4 && selectedMinute === 30 && selectedPeriod === "PM" ? "var(--accent-tint)" : "var(--surface)",
                  color: selectedHour === 4 && selectedMinute === 30 && selectedPeriod === "PM" ? "var(--accent)" : "var(--text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                4:30 PM
              </button>
              <button
                type="button"
                onClick={() => setExactSlot(5, 0, "PM")}
                style={{
                  padding: "6px 4px",
                  borderRadius: 8,
                  border: selectedHour === 5 && selectedMinute === 0 && selectedPeriod === "PM" ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: selectedHour === 5 && selectedMinute === 0 && selectedPeriod === "PM" ? "var(--accent-tint)" : "var(--surface)",
                  color: selectedHour === 5 && selectedMinute === 0 && selectedPeriod === "PM" ? "var(--accent)" : "var(--text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                5:00 PM (Close)
              </button>
            </div>
          </div>

          {/* Warning or Open Status */}
          {isAfterClosing ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--accent)",
                background: "rgba(244, 215, 121, 0.08)",
                border: "1px dashed rgba(244, 215, 121, 0.3)",
                padding: "6px 10px",
                borderRadius: 8,
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              ⚠️ Selected time is outside standard desk hours (9:30 AM – 5:00 PM). Prints will be safely held for next morning pickup.
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: "var(--status-ready)",
                background: "rgba(167, 232, 189, 0.1)",
                border: "1px solid rgba(167, 232, 189, 0.25)",
                padding: "6px 10px",
                borderRadius: 8,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--status-ready)" }} />
              <span>Campus Central Counter is open at this pickup time.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleConfirmCustomTime}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                border: "none",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 2px 10px rgba(244, 215, 121, 0.25)",
              }}
            >
              <span>{getTranslation(language, "confirm_pickup_time")}</span>
              <strong>{currentDialTime} ✓</strong>
            </button>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {getTranslation(language, "cancel_btn")}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation text if custom time active */}
      {customTime && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            Pickup scheduled: <strong style={{ color: "var(--accent)" }}>{customTime}</strong>
          </span>
          <button
            type="button"
            onClick={handleResetToAuto}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Reset to ASAP
          </button>
        </div>
      )}
    </div>
  );
}
export default CustomPickupTimeCard;
