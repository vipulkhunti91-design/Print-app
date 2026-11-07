import React, { useState, useEffect, useRef } from "react";

export interface SplashScreenProps {
  onFinish: () => void;
  duration?: number; // total duration in ms, default 1300
  isReturningUser?: boolean;
}

export default function SplashScreen({
  onFinish,
  duration = 1300,
}: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState("Initializing Phtopy...");

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const hasFinishedRef = useRef(false);

  const finishSequence = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setProgress(100);
    setStatusText("Ready for instant printing ✓");
    setIsFadingOut(true);
    setTimeout(() => {
      onFinishRef.current();
    }, 240);
  };

  useEffect(() => {
    let animFrame: number;
    let finishTimer: any;
    const startTime = performance.now();
    const totalDuration = Math.max(900, duration);

    const tick = (now: number) => {
      if (hasFinishedRef.current) return;

      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));

      setProgress(pct);

      if (pct < 30) {
        setStatusText("Initializing Phtopy...");
      } else if (pct < 65) {
        setStatusText("Connecting to Campus Central Counter...");
      } else if (pct < 98) {
        setStatusText("Syncing live print queue...");
      } else {
        setStatusText("Ready for instant printing ✓");
      }

      if (pct < 100) {
        animFrame = requestAnimationFrame(tick);
      } else {
        // Progress reached 100% full! Hold for a brief visual confirmation, then navigate to next page
        setProgress(100);
        setStatusText("Ready for instant printing ✓");
        finishTimer = setTimeout(() => {
          finishSequence();
        }, 180);
      }
    };

    animFrame = requestAnimationFrame(tick);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [duration]);

  const handleSkip = () => {
    finishSequence();
  };

  const logoSrc = `${import.meta.env.BASE_URL}assets/phtopy-logo.png`;

  return (
    <div
      role="dialog"
      aria-label="Phtopy Application Splash Screen"
      tabIndex={0}
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") handleSkip();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "48px 24px 32px",
        userSelect: "none",
        cursor: "pointer",
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? "scale(1.02)" : "scale(1)",
        transition: "opacity 240ms cubic-bezier(0.4, 0, 0.2, 1), transform 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      {/* Ambient Gold Radial Aura */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244, 215, 121, 0.16) 0%, rgba(244, 215, 121, 0.04) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top subtle badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 20,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.5px",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--status-ready)",
            boxShadow: "0 0 6px var(--status-ready)",
          }}
        />
        <span>CAMPUS SMART PRINT DESK</span>
      </div>

      {/* Center Brand Hero: User Logo & Name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          zIndex: 2,
          maxWidth: 360,
          width: "100%",
        }}
      >
        {/* Animated Custom Logo Container */}
        <div
          style={{
            marginBottom: 20,
            filter: "drop-shadow(0 8px 24px rgba(244, 215, 121, 0.22))",
            animation: "phtopyPulse 2.4s ease-in-out infinite",
          }}
        >
          <img
            src={logoSrc}
            alt="Phtopy Logo"
            style={{
              width: "100%",
              maxWidth: 290,
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = "none";
              const fallback = document.getElementById("phtopy-fallback-logo");
              if (fallback) fallback.style.display = "block";
            }}
          />

          {/* SVG Fallback in case of asset path issues */}
          <div
            id="phtopy-fallback-logo"
            style={{
              display: "none",
              fontSize: 42,
              fontWeight: 900,
              color: "var(--accent)",
              letterSpacing: "1px",
            }}
          >
            Ph🖨opy
          </div>
        </div>

        {/* Brand Name Typography */}
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "1.5px",
            color: "var(--text)",
            fontFamily: "inherit",
          }}
        >
          Phtopy
        </h1>

        {/* Tagline */}
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 13,
            color: "var(--text-secondary)",
            letterSpacing: "0.4px",
            lineHeight: 1.4,
          }}
        >
          Campus Document Printing & Instant Token Pickup
        </p>

        {/* Sleek Loading Bar */}
        <div
          style={{
            width: 220,
            maxWidth: "80vw",
            height: 5,
            borderRadius: 3,
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            marginBottom: 12,
            position: "relative",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #F4D779 0%, #FFE9A8 100%)",
              borderRadius: 3,
              boxShadow: "0 0 10px rgba(244, 215, 121, 0.5)",
              transition: progress === 100 ? "width 80ms ease-out" : "width 25ms linear",
            }}
          />
        </div>

        {/* Dynamic Status Text & Live Percentage */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 18,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: progress === 100 ? "var(--accent)" : "var(--text-muted)",
              fontWeight: progress === 100 ? 700 : 500,
              letterSpacing: "0.2px",
              transition: "color 200ms ease",
            }}
          >
            {statusText}
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--accent)",
              background: "rgba(244, 215, 121, 0.12)",
              padding: "1px 6px",
              borderRadius: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "1px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Zero Wait · Digital Queue · Campus Central
        </span>

        <span
          style={{
            fontSize: 10.5,
            color: "rgba(255, 255, 255, 0.25)",
          }}
        >
          Tap anywhere to continue
        </span>
      </div>

      <style>{`
        @keyframes phtopyPulse {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
