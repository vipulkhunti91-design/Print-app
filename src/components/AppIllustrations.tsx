import React from "react";

/**
 * PrintQ Anime-Inspired Minimal Illustrations
 * Crafted specifically for the dark UI design system:
 * - Butter Yellow accent: #F4D779
 * - Mint Green success: #A7E8BD
 * - Surface cards: #171717
 * - Surface raised: #222222
 * - Crisp outline strokes: 1.5 - 2px
 */

export function UploadHeroIllustration() {
  return (
    <svg
      className="upload-illustration anime-upload-hero"
      viewBox="0 0 180 140"
      role="img"
      aria-label="Anime-inspired printing companion and document upload"
    >
      <defs>
        <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#222222" />
          <stop offset="100%" stopColor="#171717" />
        </linearGradient>
      </defs>

      {/* Anime Twinkle Stars & Sparkles */}
      <g className="anime-sparkles">
        {/* Four-point sparkle top-left */}
        <path
          className="anime-sparkle-1"
          d="M 22 28 Q 22 34 28 34 Q 22 34 22 40 Q 22 34 16 34 Q 22 34 22 28 Z"
          fill="var(--accent)"
        />
        {/* Four-point sparkle top-right */}
        <path
          className="anime-sparkle-2"
          d="M 158 24 Q 158 30 164 30 Q 158 30 158 36 Q 158 30 152 30 Q 158 30 158 24 Z"
          fill="var(--status-ready)"
        />
        {/* Tiny twinkle dots */}
        <circle cx="162" cy="98" r="2.5" fill="var(--accent)" className="anime-dot-1" />
        <circle cx="26" cy="104" r="2" fill="var(--status-ready)" className="anime-dot-2" />
        <circle cx="44" cy="22" r="1.5" fill="#FFFFFF" opacity="0.6" />
      </g>

      {/* Floating Background Paper Sheets */}
      <g stroke="var(--border)" strokeWidth="1.2">
        <rect
          x="30"
          y="42"
          width="32"
          height="40"
          rx="6"
          fill="var(--surface)"
          className="illus-card-left anime-float-left"
        />
        <rect
          x="118"
          y="42"
          width="32"
          height="40"
          rx="6"
          fill="var(--surface)"
          className="illus-card-right anime-float-right"
        />
      </g>

      {/* Left Sheet Ruled Lines */}
      <g stroke="var(--text-secondary)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
        <path d="M 37 52 h 18 M 37 58 h 14 M 37 64 h 16" />
      </g>
      {/* Right Sheet Ruled Lines */}
      <g stroke="var(--text-secondary)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
        <path d="M 125 52 h 18 M 125 58 h 14 M 125 64 h 16" />
      </g>

      {/* Central Friendly Cloud / Printer Base */}
      <path
        d="M 48 98 c -11 0 -18 -7 -18 -16 0 -8 6 -15 15 -16 4 -13 16 -22 31 -22 17 0 31 12 33 28 10 1 17 8 17 17 0 10 -8 18 -19 18 H 48 Z"
        fill="url(#cloudGrad)"
        stroke="var(--border)"
        strokeWidth="1.5"
        className="illus-cloud anime-cloud"
      />

      {/* Cute Anime Mascot Eyes on the Cloud Base */}
      <g className="anime-mascot-face" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
        {/* Left eye: happy curved arch */}
        <path d="M 76 80 q 4 -5 8 0" fill="none" />
        {/* Right eye: happy curved arch */}
        <path d="M 96 80 q 4 -5 8 0" fill="none" />
        {/* Tiny blush dots */}
        <circle cx="73" cy="84" r="2" fill="var(--accent)" opacity="0.5" stroke="none" />
        <circle cx="107" cy="84" r="2" fill="var(--accent)" opacity="0.5" stroke="none" />
      </g>

      {/* Central Animated Upload Arrow */}
      <g className="illus-arrow anime-arrow-float">
        <path
          d="M 90 91 V 64 m 0 0 -9 9 m 9 -9 9 9"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 78 91 v 6 c 0 3 2 5 5 5 h 14 c 3 0 5 -2 5 -5 v -6"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function EmptyHistoryIllustration() {
  return (
    <svg
      className="anime-empty-history-illus"
      viewBox="0 0 160 115"
      role="img"
      aria-label="Cozy desk with organized notebook and pen"
    >
      <g className="anime-sparkles">
        <path
          className="anime-sparkle-1"
          d="M 28 22 Q 28 27 33 27 Q 28 27 28 32 Q 28 27 23 27 Q 28 27 28 22 Z"
          fill="var(--accent)"
        />
        <path
          className="anime-sparkle-2"
          d="M 136 32 Q 136 36 140 36 Q 136 36 136 40 Q 136 36 132 36 Q 136 36 136 32 Z"
          fill="var(--status-ready)"
        />
        <circle cx="34" cy="80" r="1.5" fill="var(--text-secondary)" opacity="0.6" />
        <circle cx="128" cy="85" r="2" fill="var(--accent)" opacity="0.7" />
      </g>

      {/* Desk Base Shadow Line */}
      <ellipse cx="80" cy="100" rx="60" ry="6" fill="#141414" opacity="0.7" />

      {/* Open College Notebook */}
      <g className="anime-book-float">
        {/* Left page */}
        <path
          d="M 80 42 C 65 38 48 40 36 44 C 36 44 35 84 35 84 C 48 80 65 78 80 82 Z"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        {/* Right page */}
        <path
          d="M 80 42 C 95 38 112 40 124 44 C 124 44 125 84 125 84 C 112 80 95 78 80 82 Z"
          fill="var(--surface-raised)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        {/* Notebook spine */}
        <path d="M 80 42 V 82" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Notebook text lines (clean & subtle) */}
        <path d="M 44 54 H 68 M 44 62 H 62 M 44 70 H 70" stroke="var(--text-secondary)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M 92 54 H 116 M 92 62 H 110 M 92 70 H 114" stroke="var(--text-secondary)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

        {/* Cute bookmark ribbon hanging out */}
        <path d="M 80 82 C 80 90 85 92 88 95 L 85 88" fill="none" stroke="var(--status-ready)" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Minimal Pen beside notebook */}
      <g transform="rotate(22 120 70)">
        <rect x="118" y="44" width="5" height="34" rx="2.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.2" />
        <polygon points="118,78 123,78 120.5,85" fill="var(--accent)" />
      </g>
    </svg>
  );
}

export function PaymentCelebrationIllustration() {
  return (
    <svg
      className="anime-success-celebration-illus"
      viewBox="0 0 160 120"
      role="img"
      aria-label="Celebratory anime printer friend with token"
    >
      {/* Background Anime Celebration Confetti Burst */}
      <g className="anime-confetti-burst">
        <circle cx="28" cy="28" r="2.5" fill="var(--accent)" className="anime-pop-dot-1" />
        <circle cx="42" cy="18" r="2" fill="var(--status-ready)" className="anime-pop-dot-2" />
        <circle cx="132" cy="22" r="2.5" fill="var(--accent)" className="anime-pop-dot-3" />
        <circle cx="120" cy="15" r="2" fill="var(--status-ready)" className="anime-pop-dot-4" />
        <circle cx="18" cy="58" r="1.8" fill="var(--accent)" className="anime-pop-dot-5" />
        <circle cx="144" cy="54" r="1.8" fill="var(--status-ready)" className="anime-pop-dot-6" />

        {/* Confetti diamond sparkles */}
        <path
          className="anime-sparkle-1"
          d="M 32 40 Q 32 44 36 44 Q 32 44 32 48 Q 32 44 28 44 Q 32 44 32 40 Z"
          fill="var(--accent)"
        />
        <path
          className="anime-sparkle-2"
          d="M 128 40 Q 128 44 132 44 Q 128 44 128 48 Q 128 44 124 44 Q 128 44 128 40 Z"
          fill="var(--status-ready)"
        />
      </g>

      {/* Printer Character Shadow */}
      <ellipse cx="80" cy="106" rx="46" ry="6" fill="#141414" opacity="0.8" />

      {/* Friendly Printer Buddy Body */}
      <g className="anime-printer-bounce">
        {/* Printer chassis */}
        <rect
          x="44"
          y="50"
          width="72"
          height="48"
          rx="12"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="1.8"
        />

        {/* Printer Front Output Slot */}
        <rect
          x="54"
          y="72"
          width="52"
          height="16"
          rx="6"
          fill="var(--surface-raised)"
          stroke="var(--border)"
          strokeWidth="1.2"
        />

        {/* Cute Mascot Face */}
        {/* Happy closed arched anime eyes */}
        <path d="M 66 62 q 4 -5 8 0" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <path d="M 86 62 q 4 -5 8 0" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        {/* Soft cheerful smile */}
        <path d="M 77 67 q 3 3 6 0" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Rose cheeks */}
        <circle cx="62" cy="65" r="2.5" fill="var(--accent)" opacity="0.45" />
        <circle cx="98" cy="65" r="2.5" fill="var(--accent)" opacity="0.45" />

        {/* Paper Dispensing Out of Top with Checkmark */}
        <g className="anime-paper-feed">
          <rect
            x="60"
            y="26"
            width="40"
            height="28"
            rx="5"
            fill="var(--surface-raised)"
            stroke="var(--status-ready)"
            strokeWidth="1.5"
          />
          {/* Green checkmark on printed paper */}
          <path
            d="M 74 40 L 78 44 L 86 35"
            fill="none"
            stroke="var(--status-ready)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

export function TrackingStatusIllustration({ stageIndex }: { stageIndex: number }) {
  // Stage 0: Confirmed, 1: Queued, 2: Printing, 3: Ready, 4: Completed
  return (
    <svg
      className="anime-tracking-stage-illus"
      viewBox="0 0 150 95"
      role="img"
      aria-label="Order tracking visual illustration"
    >
      {/* Background glow and sparkles */}
      <g className="anime-sparkles">
        <circle cx="20" cy="22" r="2" fill="var(--accent)" opacity="0.8" />
        <circle cx="130" cy="25" r="2" fill="var(--status-ready)" opacity="0.8" />
        <path
          className="anime-sparkle-1"
          d="M 125 45 Q 125 48 128 48 Q 125 48 125 51 Q 125 48 122 48 Q 125 48 125 45 Z"
          fill="var(--accent)"
        />
      </g>

      <ellipse cx="75" cy="84" rx="42" ry="5" fill="#141414" opacity="0.8" />

      {stageIndex <= 1 && (
        /* Queued & Scheduled: Printer with Waiting Clock & Queue Pill */
        <g className="anime-queued-state">
          <rect x="45" y="38" width="60" height="42" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="53" y="58" width="44" height="12" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1" />
          {/* Waiting eyes */}
          <circle cx="64" cy="49" r="2" fill="var(--accent)" />
          <circle cx="86" cy="49" r="2" fill="var(--accent)" />
          {/* Floating Queue Badge */}
          <g className="anime-badge-float">
            <rect x="52" y="16" width="46" height="18" rx="9" fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth="1.4" />
            <text x="75" y="29" fill="var(--accent)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.05em">IN QUEUE</text>
          </g>
        </g>
      )}

      {stageIndex === 2 && (
        /* Printing Active: Paper Sliding with Motion Waves */
        <g className="anime-printing-state">
          <rect x="45" y="38" width="60" height="42" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          {/* Animated Paper Feeding Through */}
          <g className="anime-paper-active">
            <rect x="56" y="20" width="38" height="24" rx="4" fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth="1.2" />
            <path d="M 64 26 H 86 M 64 32 H 80" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          </g>
          {/* Output Slot with emerging sheet */}
          <rect x="53" y="60" width="44" height="14" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1" />
          <path d="M 58 67 H 92" stroke="var(--status-ready)" strokeWidth="2.5" strokeLinecap="round" className="anime-roller-pulse" />
          {/* Concentrated anime printing eyes */}
          <path d="M 63 50 L 69 50" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 81 50 L 87 50" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {stageIndex === 3 && (
        /* Ready for Pickup: Golden Token Card on Shelf with Star */
        <g className="anime-ready-state">
          {/* Shelf base */}
          <rect x="36" y="66" width="78" height="12" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          {/* Stack of neatly printed pages */}
          <rect x="50" y="48" width="50" height="18" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.2" />
          <rect x="47" y="44" width="50" height="18" rx="4" fill="var(--surface)" stroke="var(--status-ready)" strokeWidth="1.4" />
          {/* Star badge on top */}
          <circle cx="72" cy="32" r="14" fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth="1.8" />
          <path
            d="M 72 23 L 74.5 28.5 L 80.5 29 L 76 33 L 77.5 39 L 72 36 L 66.5 39 L 68 33 L 63.5 29 L 69.5 28.5 Z"
            fill="var(--accent)"
          />
        </g>
      )}

      {stageIndex >= 4 && (
        /* Completed: Finished sealed portfolio folder with ribbon */
        <g className="anime-completed-state">
          <rect x="45" y="28" width="60" height="52" rx="8" fill="var(--surface)" stroke="var(--status-ready)" strokeWidth="1.6" />
          <path d="M 45 40 L 75 58 L 105 40" fill="none" stroke="var(--status-ready)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="75" cy="58" r="8" fill="var(--surface-raised)" stroke="var(--status-ready)" strokeWidth="1.6" />
          <path d="M 72 58 L 74 60 L 78 56" fill="none" stroke="var(--status-ready)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

export function NoActiveOrderIllustration() {
  return (
    <svg
      className="anime-no-order-illus"
      viewBox="0 0 150 100"
      role="img"
      aria-label="Sleeping printer character ready for next order"
    >
      <g className="anime-sparkles">
        <circle cx="25" cy="30" r="1.5" fill="var(--text-secondary)" opacity="0.6" />
        <circle cx="125" cy="25" r="2" fill="var(--accent)" opacity="0.7" />
        {/* Floating sleepy Zs */}
        <text x="108" y="32" fill="var(--accent)" fontSize="11" fontWeight="800" opacity="0.8">z</text>
        <text x="116" y="22" fill="var(--accent)" fontSize="13" fontWeight="800" opacity="0.9">Z</text>
      </g>

      <ellipse cx="75" cy="80" rx="40" ry="5" fill="#141414" opacity="0.7" />

      {/* Sleeping printer base */}
      <g className="anime-sleep-bounce">
        <rect x="45" y="38" width="60" height="40" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="54" y="56" width="42" height="12" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1" />
        {/* Sleeping peaceful closed eyes */}
        <path d="M 63 48 q 4 3 8 0" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 79 48 q 4 3 8 0" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function PrinterPaymentProcessingIllustration() {
  return (
    <svg
      className="printer-processing-illus"
      viewBox="0 0 160 130"
      role="img"
      aria-label="Printer processing payment animation"
    >
      {/* Soft Ground Shadow */}
      <ellipse cx="80" cy="118" rx="46" ry="5" fill="#141414" opacity="0.8" />

      {/* Top Paper Infeed Tray */}
      <rect x="52" y="16" width="56" height="24" rx="5" fill="#1E1E1E" stroke="#2D2D2D" strokeWidth="1.4" />

      {/* Paper gliding into the printer */}
      <g className="printer-feed-in-paper">
        <rect x="56" y="12" width="48" height="28" rx="4" fill="#F5F5F5" />
        <line x1="62" y1="18" x2="88" y2="18" stroke="#D4D4D4" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="62" y1="24" x2="96" y2="24" stroke="#E5E5E5" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="62" y1="30" x2="82" y2="30" stroke="#E5E5E5" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Main Printer Body (Printer Mascot Chassis) */}
      <g className="printer-chassis-group">
        <rect
          x="38"
          y="38"
          width="84"
          height="58"
          rx="12"
          fill="#171717"
          stroke="#2A2A2A"
          strokeWidth="1.8"
        />

        {/* Accent Top Lip in Butter Yellow */}
        <rect x="44" y="42" width="72" height="3" rx="1.5" fill="var(--accent)" opacity="0.85" />

        {/* Status LED: Pulses during payment */}
        <circle cx="110" cy="50" r="3.2" fill="var(--accent)" className="printer-processing-led" />
        <circle cx="110" cy="50" r="6" fill="var(--accent)" opacity="0.25" className="printer-processing-led-halo" />

        {/* Brand Label "PrintQ" on chassis */}
        <text x="50" y="53" fill="var(--text-secondary)" fontSize="8.5" fontWeight="700" letterSpacing="0.05em">PRINTQ</text>

        {/* Front Output Slot */}
        <rect
          x="48"
          y="66"
          width="64"
          height="20"
          rx="5"
          fill="#0D0D0D"
          stroke="#262626"
          strokeWidth="1.2"
        />

        {/* Freshly Printed Output Paper */}
        <g className="printer-feed-out-paper">
          <rect
            x="54"
            y="72"
            width="52"
            height="34"
            rx="4"
            fill="#FFFFFF"
            stroke="#E5E5E5"
            strokeWidth="1"
          />
          {/* Printed Content Lines */}
          <line x1="60" y1="78" x2="98" y2="78" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="84" x2="92" y2="84" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="90" x2="86" y2="90" stroke="#A3A3A3" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="60" y1="96" x2="78" y2="96" stroke="#D4D4D4" strokeWidth="1.6" strokeLinecap="round" />
          {/* Soft Mint Green Checkmark Stamp on Printout */}
          <circle cx="94" cy="94" r="5" fill="var(--status-ready)" opacity="0.2" />
          <path d="M 91.5 94 l 2 2 l 3.5 -4" fill="none" stroke="var(--status-ready)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}
