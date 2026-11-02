import { useState, useRef, useEffect, type TouchEvent } from "react"

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<number>(0)

  const [direction, setDirection] = useState<"forward" | "backward">("forward")

  const touchStartX = useRef<number | null>(null)

  const touchStartY = useRef<number | null>(null)

  // Check prefers-reduced-motion

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

      setPrefersReducedMotion(mediaQuery.matches)

      const listener = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches)

      mediaQuery.addEventListener("change", listener)

      return () => mediaQuery.removeEventListener("change", listener)
    } catch {
      // Default false
    }
  }, [])

  const handleNext = () => {
    if (currentStep < 4) {
      setDirection("forward")

      setCurrentStep((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection("backward")

      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleFinish = () => {
    try {
      window.localStorage.setItem("onboardingCompleted", "true")
    } catch {}

    onComplete()
  }

  const handleDotClick = (index: number) => {
    setDirection(index > currentStep ? "forward" : "backward")

    setCurrentStep(index)
  }

  // Touch Swipe Gesture Handling

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX

      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current

    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    // Detect horizontal swipe if deltaX is significantly larger than vertical deltaY

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swiped Left -> Next

        if (currentStep < 4) {
          handleNext()
        } else {
          handleFinish()
        }
      } else {
        // Swiped Right -> Previous

        if (currentStep > 0) {
          handlePrev()
        }
      }
    }

    touchStartX.current = null

    touchStartY.current = null
  }

  return (
    <div
      className="onboarding-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Welcome onboarding tutorial"
    >
      <div
        className={`onboarding-card ${
          prefersReducedMotion ? "reduced-motion" : ""
        }`}
      >
        {/* Step Content Container with Key for Re-triggering Animation */}
        <div
          key={currentStep}
          className={`onboarding-slide slide-${direction}`}
        >
          {/* 1. Illustration Area */}
          <div className="onboarding-illustration-container">
            {currentStep === 0 && <IllustrationQueue />}
            {currentStep === 1 && <IllustrationSettings />}
            {currentStep === 2 && <IllustrationMultipleFiles />}
            {currentStep === 3 && <IllustrationToken />}
            {currentStep === 4 && <QuickToolsShowcase />}
          </div>

          {/* 2. Text Copy Area */}
          <div className="onboarding-text-area">
            {currentStep === 0 && (
              <>
                <h1 className="onboarding-heading">
                  No more waiting in queues.
                </h1>
                <p className="onboarding-subtext">
                  Upload your file, get a token, and pick up your printout when
                  it&apos;s ready.
                </p>
              </>
            )}
            {currentStep === 1 && (
              <>
                <h1 className="onboarding-heading">Set it your way.</h1>
                <p className="onboarding-subtext">
                  Choose paper size, colour mode, and number of copies, all in
                  one place.
                </p>
              </>
            )}
            {currentStep === 2 && (
              <>
                <h1 className="onboarding-heading">Each file, your way.</h1>
                <p className="onboarding-subtext">
                  Upload multiple files and set different print settings for
                  each one separately.
                </p>
              </>
            )}
            {currentStep === 3 && (
              <>
                <h1 className="onboarding-heading">Your token, your time.</h1>
                <p className="onboarding-subtext">
                  Get a token instantly after placing your order. We&apos;ll
                  notify you when your print is ready.
                </p>
              </>
            )}
            {currentStep === 4 && (
              <>
                <h1 className="onboarding-heading">PrintQ Quick Tools</h1>
                <p className="onboarding-subtext">
                  Legibility checks, deadline estimates and group cost splits
                  are built right into your print setup.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 3. Bottom Controls */}
        <div className="onboarding-bottom-bar">
          {/* Dots Indicator: 5 dots */}
          <div
            className="onboarding-dots"
            role="tablist"
            aria-label="Onboarding screens"
          >
            {[0, 1, 2, 3, 4].map((idx) => (
              <button
                key={idx}
                type="button"
                className={`onboarding-dot ${
                  currentStep === idx ? "is-active" : ""
                }`}
                onClick={() => handleDotClick(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                role="tab"
                aria-selected={currentStep === idx}
              />
            ))}
          </div>

          {/* Action Button: Next → for 0-3; Get Started for 4 */}
          {currentStep < 4 ? (
            <button
              type="button"
              className="onboarding-primary-btn"
              onClick={handleNext}
              aria-label="Next slide"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-primary-btn get-started-btn"
              onClick={handleFinish}
              aria-label="Get Started"
            >
              Get Started
            </button>
          )}

          {/* Skip Button: Only on all screens before the last */}
          {currentStep < 4 ? (
            <button
              type="button"
              className="onboarding-skip-btn"
              onClick={handleFinish}
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          ) : (
            <div className="onboarding-skip-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================

// Screen 1 Illustration: Clock with cross mark / Zero queue waiting

// ============================================================================

function IllustrationQueue() {
  return (
    <div className="onboarding-art" aria-hidden="true">
      <svg viewBox="0 0 280 200" fill="none" className="onboarding-svg">
        <defs>
          <radialGradient id="art-glow-1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft ambient glow */}
        <circle cx="140" cy="100" r="95" fill="url(#art-glow-1)" />

        {/* LEFT: old way — three people waiting in a queue */}
        <rect
          x="16"
          y="26"
          width="108"
          height="148"
          rx="16"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <text
          x="70"
          y="46"
          fill="var(--text-muted)"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="sans-serif"
          letterSpacing="0.1em"
          textAnchor="middle"
        >
          CAMPUS QUEUE
        </text>

        {/* Waiting clock */}
        <circle
          cx="70"
          cy="66"
          r="9"
          stroke="var(--text-muted)"
          strokeWidth="1.6"
        />
        <path
          d="M70 60.5v5.5l3.5 2"
          stroke="var(--text-muted)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Three clearly drawn people, standing in line */}
        <g fill="var(--text-muted)">
          <circle cx="42" cy="100" r="8" />
          <path d="M30 134c0-17 6-23 12-23s12 6 12 23H30z" />
          <circle cx="70" cy="100" r="8" />
          <path d="M58 134c0-17 6-23 12-23s12 6 12 23H58z" />
          <circle cx="98" cy="100" r="8" />
          <path d="M86 134c0-17 6-23 12-23s12 6 12 23H86z" />
        </g>

        {/* "No waiting" slash over the queue */}
        <line
          x1="28"
          y1="146"
          x2="116"
          y2="84"
          stroke="var(--error)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <text
          x="70"
          y="162"
          fill="var(--error)"
          fontSize="9"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="0.08em"
          textAnchor="middle"
        >
          WAITING
        </text>

        {/* Arrow: old way → PrintQ */}
        <path
          d="M128 100h16M138 94l7 6-7 6"
          stroke="var(--text-secondary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* RIGHT: PrintQ — instant token, no queue */}
        <rect
          x="156"
          y="26"
          width="108"
          height="148"
          rx="16"
          fill="var(--surface)"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <text
          x="210"
          y="46"
          fill="var(--accent)"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="sans-serif"
          letterSpacing="0.1em"
          textAnchor="middle"
        >
          PRINTQ
        </text>

        {/* Token card */}
        <rect
          x="174"
          y="60"
          width="72"
          height="66"
          rx="12"
          fill="var(--surface-raised)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <text
          x="210"
          y="88"
          fill="var(--accent)"
          fontSize="22"
          fontWeight="900"
          fontFamily="sans-serif"
          textAnchor="middle"
          letterSpacing="-0.02em"
        >
          A-26
        </text>
        <text
          x="210"
          y="104"
          fill="var(--text-secondary)"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="sans-serif"
          letterSpacing="0.08em"
          textAnchor="middle"
        >
          YOUR TOKEN
        </text>

        {/* Success check badge */}
        <circle
          cx="242"
          cy="58"
          r="10"
          fill="var(--status-ready)"
          stroke="var(--surface)"
          strokeWidth="2.5"
        />
        <path
          d="M237.5 58l3 3 6-6"
          stroke="var(--on-accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text
          x="210"
          y="162"
          fill="var(--status-ready)"
          fontSize="9"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="0.08em"
          textAnchor="middle"
        >
          INSTANT PICKUP
        </text>
      </svg>
    </div>
  )
}

// ============================================================================

// Screen 2 Illustration: Settings panel, Sliders, Paper Size & Mode (Kept as is)

// ============================================================================

function IllustrationSettings() {
  return (
    <div className="onboarding-art" aria-hidden="true">
      <svg viewBox="0 0 280 200" fill="none" className="onboarding-svg">
        <defs>
          <radialGradient id="art-glow-2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F4D779" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="100" r="85" fill="url(#art-glow-2)" />

        {/* Settings Surface Box */}
        <rect
          x="45"
          y="25"
          width="190"
          height="150"
          rx="18"
          fill="#171717"
          stroke="#262626"
          strokeWidth="1.5"
        />

        {/* Top Header Row in Card */}
        <rect x="60" y="42" width="60" height="8" rx="4" fill="#444" />
        <rect
          x="180"
          y="38"
          width="40"
          height="16"
          rx="8"
          fill="rgba(244, 215, 121, 0.15)"
          stroke="#F4D779"
          strokeWidth="1"
        />
        <circle cx="208" cy="46" r="5" fill="#F4D779" />

        {/* Slider 1: Paper Size Selection */}
        <g transform="translate(60, 68)">
          <rect x="0" y="5" width="160" height="4" rx="2" fill="#2A2A2A" />
          <rect x="0" y="5" width="70" height="4" rx="2" fill="#F4D779" />
          <circle
            cx="70"
            cy="7"
            r="7"
            fill="#F4D779"
            stroke="#171717"
            strokeWidth="2"
          />
          <text
            x="0"
            y="-1"
            fill="#888"
            fontSize="9"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            PAPER SIZE
          </text>
          <text
            x="135"
            y="-1"
            fill="#F4D779"
            fontSize="9"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            A4
          </text>
        </g>

        {/* Slider 2: Number of Copies */}
        <g transform="translate(60, 106)">
          <rect x="0" y="5" width="160" height="4" rx="2" fill="#2A2A2A" />
          <rect x="0" y="5" width="115" height="4" rx="2" fill="#F4D779" />
          <circle
            cx="115"
            cy="7"
            r="7"
            fill="#F4D779"
            stroke="#171717"
            strokeWidth="2"
          />
          <text
            x="0"
            y="-1"
            fill="#888"
            fontSize="9"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            COPIES & SIDES
          </text>
          <text
            x="126"
            y="-1"
            fill="#F4D779"
            fontSize="9"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            2 COPIES
          </text>
        </g>

        {/* Option Chips at bottom */}
        <g transform="translate(60, 138)">
          <rect
            x="0"
            y="0"
            width="46"
            height="22"
            rx="6"
            fill="#222"
            stroke="#F4D779"
            strokeWidth="1"
          />
          <text
            x="9"
            y="15"
            fill="#F4D779"
            fontSize="10"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            B&W
          </text>

          <rect
            x="52"
            y="0"
            width="52"
            height="22"
            rx="6"
            fill="#1C1C1C"
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x="61"
            y="15"
            fill="#777"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Colour
          </text>

          <rect
            x="110"
            y="0"
            width="50"
            height="22"
            rx="6"
            fill="#1C1C1C"
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x="119"
            y="15"
            fill="#777"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Duplex
          </text>
        </g>
      </svg>
    </div>
  )
}

// ============================================================================

// Screen 3 Illustration: 3 stacked file cards with settings badges (NEW)

// ============================================================================

function IllustrationMultipleFiles() {
  return (
    <div className="onboarding-art" aria-hidden="true">
      <svg viewBox="0 0 280 200" fill="none" className="onboarding-svg">
        <defs>
          <radialGradient id="art-glow-multi" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F4D779" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
          </radialGradient>
          <filter
            id="card-shadow-1"
            x="-10%"
            y="-10%"
            width="125%"
            height="135%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="6"
              floodColor="#000000"
              floodOpacity="0.45"
            />
          </filter>
          <filter
            id="card-shadow-2"
            x="-10%"
            y="-10%"
            width="125%"
            height="135%"
          >
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="8"
              floodColor="#000000"
              floodOpacity="0.55"
            />
          </filter>
          <filter
            id="card-shadow-3"
            x="-10%"
            y="-10%"
            width="125%"
            height="135%"
          >
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="9"
              floodColor="#000000"
              floodOpacity="0.65"
            />
          </filter>
        </defs>

        {/* Ambient Glow */}
        <circle cx="140" cy="100" r="90" fill="url(#art-glow-multi)" />

        {/* Card 1: assignment.pdf · Colour · 3 copies (Top / Back-left) */}
        <g filter="url(#card-shadow-1)">
          <rect
            x="22"
            y="18"
            width="186"
            height="48"
            rx="12"
            fill="#171717"
            stroke="#2B2B2B"
            strokeWidth="1.2"
          />
          {/* File Document Icon */}
          <g transform="translate(34, 27)">
            <path
              d="M2 1h7l4 4v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
              fill="#222"
              stroke="#F4D779"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <polyline
              points="9 1 9 5 13 5"
              fill="none"
              stroke="#F4D779"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <line
              x1="4"
              y1="8"
              x2="10"
              y2="8"
              stroke="#888"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="11"
              x2="8"
              y2="11"
              stroke="#888"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
          {/* Filename */}
          <text
            x="56"
            y="37"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            assignment.pdf
          </text>
          {/* Checkmark tick pill */}
          <circle cx="62" cy="51" r="5" fill="rgba(244, 215, 121, 0.16)" />
          <polyline
            points="59.5,51 61.2,52.8 64.5,49.5"
            fill="none"
            stroke="#F4D779"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Settings Badge text */}
          <text
            x="72"
            y="54.5"
            fill="#A3A9B8"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Colour · 3 copies
          </text>
        </g>

        {/* Card 2: resume.pdf · B&W · 2 copies (Middle / Center) */}
        <g filter="url(#card-shadow-2)">
          <rect
            x="48"
            y="74"
            width="186"
            height="48"
            rx="12"
            fill="#171717"
            stroke="#363636"
            strokeWidth="1.2"
          />
          {/* File Document Icon */}
          <g transform="translate(60, 83)">
            <path
              d="M2 1h7l4 4v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
              fill="#222"
              stroke="#8FA3FF"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <polyline
              points="9 1 9 5 13 5"
              fill="none"
              stroke="#8FA3FF"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <line
              x1="4"
              y1="8"
              x2="10"
              y2="8"
              stroke="#888"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="11"
              x2="8"
              y2="11"
              stroke="#888"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
          {/* Filename */}
          <text
            x="82"
            y="93"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            resume.pdf
          </text>
          {/* Checkmark tick pill */}
          <circle cx="88" cy="107" r="5" fill="rgba(244, 215, 121, 0.16)" />
          <polyline
            points="85.5,107 87.2,108.8 90.5,105.5"
            fill="none"
            stroke="#F4D779"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Settings Badge text */}
          <text
            x="98"
            y="110.5"
            fill="#A3A9B8"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            B&W · 2 copies
          </text>
        </g>

        {/* Card 3: photo.jpg · Glossy · 1 copy (Bottom / Front-right) */}
        <g filter="url(#card-shadow-3)">
          <rect
            x="74"
            y="130"
            width="186"
            height="48"
            rx="12"
            fill="#171717"
            stroke="#444444"
            strokeWidth="1.2"
          />
          {/* Picture / Photo Icon */}
          <g transform="translate(86, 139)">
            <rect
              x="1"
              y="1"
              width="14"
              height="14"
              rx="2"
              fill="#222"
              stroke="#A7E8BD"
              strokeWidth="1.2"
            />
            <circle cx="5" cy="5" r="1.5" fill="#A7E8BD" />
            <path
              d="M2 13l4-4 3 3 2-2 3 3"
              fill="none"
              stroke="#A7E8BD"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          {/* Filename */}
          <text
            x="108"
            y="149"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            photo.jpg
          </text>
          {/* Checkmark tick pill */}
          <circle cx="114" cy="163" r="5" fill="rgba(244, 215, 121, 0.16)" />
          <polyline
            points="111.5,163 113.2,164.8 116.5,161.5"
            fill="none"
            stroke="#F4D779"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Settings Badge text */}
          <text
            x="124"
            y="166.5"
            fill="#A3A9B8"
            fontSize="10"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Glossy · 1 copy
          </text>
        </g>
      </svg>
    </div>
  )
}

// ============================================================================

// Guide Screen: PrintQ Quick Tools overview

// ============================================================================

function QuickToolsShowcase() {
  const tools = [
    { icon: "🔍", title: "B&W Legibility" },
    { icon: "⏱", title: "Deadline Check" },
    { icon: "👥", title: "Group Printing" },
    { icon: "🌐", title: "Language" },
  ]

  return (
    <div
      className="onboarding-quick-tools"
      style={{
        width: "100%",
        maxWidth: 320,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}
    >
      {tools.map((tool) => (
        <div
          key={tool.title}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            textAlign: "center",
            minHeight: 92,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--accent-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {tool.icon}
          </span>
          <strong
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {tool.title}
          </strong>
        </div>
      ))}
    </div>
  )
}

// ============================================================================

// Screen 4 Illustration: Token card with verified checkmark & collection

// ============================================================================

function IllustrationToken() {
  return (
    <div className="onboarding-art" aria-hidden="true">
      <svg viewBox="0 0 280 200" fill="none" className="onboarding-svg">
        <defs>
          <radialGradient id="art-glow-3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A7E8BD" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="100" r="90" fill="url(#art-glow-3)" />

        {/* Large Prominent Token Card */}
        <rect
          x="60"
          y="30"
          width="160"
          height="140"
          rx="20"
          fill="#171717"
          stroke="#333"
          strokeWidth="1.5"
        />

        {/* Dashed Ticket Border Line */}
        <line
          x1="75"
          y1="78"
          x2="205"
          y2="78"
          stroke="#2A2A2A"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />

        {/* Counter Header Tag */}
        <rect
          x="90"
          y="44"
          width="100"
          height="20"
          rx="10"
          fill="rgba(244, 215, 121, 0.12)"
          stroke="#F4D779"
          strokeWidth="1"
        />
        <text
          x="105"
          y="58"
          fill="#F4D779"
          fontSize="10"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="0.05em"
        >
          PICKUP TOKEN
        </text>

        {/* Bold Token Number */}
        <text
          x="104"
          y="122"
          fill="#FFFFFF"
          fontSize="34"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="-0.02em"
        >
          A-26
        </text>

        {/* Green Success Badge on Card */}
        <circle
          cx="198"
          cy="144"
          r="16"
          fill="#A7E8BD"
          stroke="#171717"
          strokeWidth="2.5"
        />
        <polyline
          points="191,144 196,149 205,139"
          stroke="#0A0A0A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtitle status pill */}
        <rect x="80" y="134" width="85" height="20" rx="6" fill="#222" />
        <circle cx="92" cy="144" r="3.5" fill="#A7E8BD" />
        <text
          x="102"
          y="148"
          fill="#A7E8BD"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          Ready in 10m
        </text>
      </svg>
    </div>
  )
}
