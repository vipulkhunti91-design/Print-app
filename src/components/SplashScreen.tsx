import React, { useState, useEffect } from "react";

export interface SplashScreenProps {
  onFinish: () => void;
  duration?: number; // total duration in ms, default 1800
}

export default function SplashScreen({
  onFinish,
  duration = 1800,
}: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState("Initializing Phtopy...");

  useEffect(() => {
    // Dynamic loading messages
    const t1 = setTimeout(() => {
      setStatusText("Connecting to Campus Central Counter...");
    }, duration * 0.3);

    const t2 = setTimeout(() => {
      setStatusText("Syncing live print queue...");
    }, duration * 0.65);

    const t3 = setTimeout(() => {
      setStatusText("Ready for instant printing ✓");
    }, duration * 0.9);

    // Progress bar animation
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinish();
        }, 380);
      }
    }, 25);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [duration, onFinish]);

  const handleSkip = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 250);
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
        transform: isFadingOut ? "scale(1.03)" : "scale(1)",
        transition: "opacity 380ms cubic-bezier(0.4, 0, 0.2, 1), transform 380ms cubic-bezier(0.4, 0, 0.2, 1)",
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
            width: 200,
            height: 4,
            borderRadius: 2,
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            marginBottom: 10,
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #F4D779 0%, #FFE9A8 100%)",
              borderRadius: 2,
              transition: "width 40ms linear",
            }}
          />
        </div>

        {/* Dynamic Status Text */}
        <span
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            fontWeight: 500,
            minHeight: 16,
            transition: "all 200ms ease",
          }}
        >
          {statusText}
        </span>
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
