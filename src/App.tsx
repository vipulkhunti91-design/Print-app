import { useCallback, useEffect, useRef, useState } from "react";
import {
  BottomNavigation,
  ContinueButton,
  PaperSizeSelector,
  PaperStockGrid,
  PaymentSelector,
  PrintOptionCard,
  QuickPrintCard,
  SelectionCard,
  StartPrintingButton,
  StepPill,
  TokenCard,
} from "./components/PrintComponents";
import AppIcon from "./components/AppIcon";
import { formatTimeRemaining, getShopStatus, type ShopStatus } from "./config/shopHours";

const A = `${import.meta.env.BASE_URL}assets`;

type Screen =
  | "login"
  | "register"
  | "otp"
  | "home"
  | "document"
  | "setup"
  | "finishing"
  | "checkout"
  | "paymentSuccess"
  | "token"
  | "notifications"
  | "history"
  | "profile"
  | "settings"
  | "help";

type PrintJob = {
  title: string;
  fileName: string;
  fileSize: string;
  pages: number;
  colour: boolean;
  singleSided: boolean;
  paper: string;
  paperSurcharge: number;
  copies: number;
  pricePerPage: number;
  sideSurcharge: number;
  stockIndex: number;
  stockSurcharge: number;
};

type ActiveOrder = {
  token: string;
  job: PrintJob;
  status: "queued" | "printing" | "ready" | "pickup" | "cancelled";
};

const orderStatusLabels: Record<ActiveOrder["status"], string> = {
  queued: "Queued",
  printing: "Printing",
  ready: "Ready",
  pickup: "Pick up",
  cancelled: "Cancelled",
};

type FilePreviewData = {
  url: string;
  type: string;
  name: string;
  size: string;
} | null;

type UploadedFileData = NonNullable<FilePreviewData>;

const defaultPrintJob: PrintJob = {
  title: "Assignment",
  fileName: "Class_Document.pdf",
  fileSize: "2.4 MB",
  pages: 12,
  colour: false,
  singleSided: false,
  paper: "A4",
  paperSurcharge: 0,
  copies: 1,
  pricePerPage: 2,
  sideSurcharge: 0,
  stockIndex: 0,
  stockSurcharge: 0,
};

const quickPrints = [
  { title: "Assignment", detail: "B&W · 2-sided", icon: "assignment", preset: defaultPrintJob },
  { title: "Quick Notes", detail: "B&W or colour · 1 or 2 sided", icon: "notes", preset: { ...defaultPrintJob, title: "Quick Notes", fileName: "Quick_Notes.pdf", fileSize: "4.1 MB", pages: 24, singleSided: true, sideSurcharge: 1 } },
  { title: "Report", detail: "B&W · 1-sided", icon: "report", preset: { ...defaultPrintJob, title: "Report", fileName: "Project_Report.pdf", fileSize: "3.2 MB", pages: 18, singleSided: true, sideSurcharge: 1 } },
  { title: "Project", detail: "Colour · 1-sided", icon: "project", preset: { ...defaultPrintJob, title: "Project", fileName: "Project_Document.pdf", fileSize: "5.6 MB", pages: 10, colour: true, singleSided: true, pricePerPage: 8, sideSurcharge: 1 } },
  { title: "Resume", detail: "B&W · single-sided", icon: "resume", preset: { ...defaultPrintJob, title: "Resume", fileName: "Mehul_Resume.pdf", fileSize: "0.8 MB", pages: 2, singleSided: true, sideSurcharge: 1 } },
  { title: "Presentation", detail: "Colour · 1-sided", icon: "presentation", preset: { ...defaultPrintJob, title: "Presentation", fileName: "Campus_Presentation.pdf", fileSize: "7.3 MB", pages: 15, colour: true, singleSided: true, pricePerPage: 8, sideSurcharge: 1 } },
];

function formatPrice(job: PrintJob) {
  const pages = Number(job.pages) || 0;
  const pricePerPage = Number(job.pricePerPage) || 0;
  const sideSurcharge = Number(job.sideSurcharge) || 0;
  const paperSurcharge = Number(job.paperSurcharge) || 0;
  const stockSurcharge = Number(job.stockSurcharge) || 0;
  const copies = Number(job.copies) || 0;
  const total = pages * (pricePerPage + sideSurcharge + paperSurcharge + stockSurcharge) * copies;

  return `₹${Number.isFinite(total) ? total.toFixed(2) : "0.00"}`;
}

type AppNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: string;
  kind?: "shop-closing";
  dateKey?: string;
  shopState?: "closing-soon" | "closed";
};

const defaultNotifications: AppNotification[] = [
  { id: "shop-open", title: "Print Shop Open", detail: "The campus print shop is now open.", time: "Mon", icon: "fa4b6.svg" },
  { id: "printing-started", title: "Printing Started", detail: "Your assignment DSP_Lab_Manual_Final.pdf.", time: "5m", icon: "eaf6a.svg" },
  { id: "payment-successful", title: "Payment Successful", detail: "Your assignment DSP_Lab_Manual_Final.pdf.", time: "10m", icon: "4b343.svg" },
  { id: "print-ready", title: "Print Ready", detail: "Your assignment DSP_Lab_Manual_Final.pdf. is ready for collection.", time: "2m", icon: "4774e.svg" },
];

const notificationStorageKey = "phopy-notifications";

function readNotifications(): AppNotification[] {
  try {
    const saved = window.localStorage.getItem(notificationStorageKey);
    if (!saved) return defaultNotifications;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as AppNotification[] : defaultNotifications;
  } catch {
    return defaultNotifications;
  }
}

const orders = [
  { token: "A-26", file: "DSP_Lab_Manual_Final.pdf", meta: "5 pages · 1 copy · A3 · Black & White · Double", price: "₹120.00", status: "Ready", action: "Take Print", icon: "48c44.svg" },
  { token: "A-14", file: "Mehul_Resume_SWE_2026.pdf", meta: "2 pages · 3 copies · A4 (Premium) · Colour · Single", price: "₹48.00", status: "Pending", action: "Print Again", icon: "3f8e5.svg" },
  { token: "C-22", file: "Wedding_Invitation_Design.pdf", meta: "1 page · 10 copies · A5 · Colour · Single", price: "₹250.00", status: "Completed", action: "Print Again", icon: "3f8e5.svg" },
  { token: "D-31", file: "Priya_Marketing_Proposal.pdf", meta: "8 pages · 2 copies · A4 (Premium) · Colour · Double", price: "₹96.00", status: "Completed", action: "Print Again", icon: "3f8e5.svg" },
  { token: "E-15", file: "Campus_Event_Poster.pdf", meta: "1 page · 25 copies · A2 · Colour · Single", price: "₹375.00", status: "Cancelled", action: "Print Again", icon: "0bcda.svg" },
];

function Asset({ name, className = "" }: { name: string; className?: string }) {
  return <AppIcon name={name} className={className} />;
}

function AuthLogo() {
  return (
    <div className="auth-logo" aria-label="Phopy">
      <span>Ph</span>
      <Asset name="85546.svg" />
      <span>opy</span>
    </div>
  );
}

function SocialButtons({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="social-buttons">
      <button type="button" onClick={onContinue}>
        <Asset name="64eb8.svg" />
        Facebook
      </button>
      <button type="button" onClick={onContinue}>
        <svg className="google-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
        </svg>
        Google
      </button>
    </div>
  );
}

function AuthSkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button className="auth-skip" type="button" onClick={onSkip}>
      Skip for now
    </button>
  );
}

function Login({ go }: { go: (screen: Screen) => void }) {
  const [identity, setIdentity] = useState("");
  return (
    <main className="auth-page">
      <AuthLogo />
      <form
        className="auth-panel login-panel"
        onSubmit={(event) => {
          event.preventDefault();
          go("otp");
        }}
      >
        <div className="auth-title-row">
          <h1>Let’s Get Started</h1>
          <button type="button" onClick={() => go("register")}>Register</button>
        </div>
        <p>Enter your email or phone number to receive an OTP.</p>
        <input
          aria-label="Email or phone number"
          value={identity}
          onChange={(event) => setIdentity(event.target.value)}
          placeholder="Email / Number"
          required
        />
        <button className="auth-primary" type="submit">Send OTP</button>
        <SocialButtons onContinue={() => go("home")} />
        <AuthSkipButton onSkip={() => go("home")} />
      </form>
    </main>
  );
}

function Register({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="auth-page register-page">
      <AuthLogo />
      <form
        className="auth-panel register-panel"
        onSubmit={(event) => {
          event.preventDefault();
          go("otp");
        }}
      >
        <h1>Create your account</h1>
        <p>Enter your details to get started.</p>
        <input aria-label="Name" placeholder="Name" required />
        <input aria-label="Email or phone number" placeholder="Email / Number" required />
        <button className="auth-primary" type="submit">Continue</button>
        <SocialButtons onContinue={() => go("home")} />
        <button className="auth-back" type="button" onClick={() => go("login")}>Already registered? Sign in</button>
        <AuthSkipButton onSkip={() => go("home")} />
      </form>
    </main>
  );
}

function Otp({ go }: { go: (screen: Screen) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };
  return (
    <main className="auth-page otp-page">
      <AuthLogo />
      <form
        className="auth-panel otp-panel"
        onSubmit={(event) => {
          event.preventDefault();
          go("home");
        }}
      >
        <h1>Waiting For OTP</h1>
        <p>Enter the OTP sent to your device.</p>
        <div className="otp-inputs">
          {digits.map((digit, index) => (
            <input
              id={`otp-${index}`}
              key={index}
              aria-label={`OTP digit ${index + 1}`}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digit && index > 0) {
                  document.getElementById(`otp-${index - 1}`)?.focus();
                }
              }}
              required
            />
          ))}
        </div>
        <button className="auth-primary" type="submit">Continue</button>
        <button className="auth-back" type="button" onClick={() => go("login")}>Use a different email or number</button>
      </form>
    </main>
  );
}

function AppHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <header className="simple-header">
      {onBack && (
        <button className="icon-button back-button" onClick={onBack} aria-label="Go back">
          <Asset name="678a9.svg" />
        </button>
      )}
      <h1>{title}</h1>
    </header>
  );
}

function MenuRow({
  icon,
  title,
  detail,
  onClick,
  danger = false,
}: {
  icon: string;
  title: string;
  detail?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button className={`menu-row ${danger ? "danger" : ""}`} onClick={onClick}>
      <span className="menu-icon"><Asset name={icon} /></span>
      <span className="menu-copy"><b>{title}</b>{detail && <small>{detail}</small>}</span>
      <span className="menu-chevron"><Asset name="12960.svg" /></span>
    </button>
  );
}

function StepHeader({
  active,
  go,
  close,
}: {
  active: 1 | 2 | 3 | 4;
  go: (screen: Screen) => void;
  close: () => void;
}) {
  const steps: { label: string; screen: Screen }[] = [
    { label: "Document", screen: "document" },
    { label: "Print Setup", screen: "setup" },
    { label: "Finishing", screen: "finishing" },
    { label: "Checkout", screen: "checkout" },
  ];
  return (
    <>
      <div className="studio-heading">
        <div>
          <h1>Print Studio</h1>
          <p>Step {active} of 4 · {steps[active - 1].label}</p>
        </div>
        <button className="close-button" onClick={close} aria-label="Close">
          <Asset name="d82cc.svg" />
        </button>
      </div>
      <nav className="steps" aria-label="Print steps">
        {steps.map((step, index) => (
          <StepPill
            label={step.label}
            active={active === index + 1}
            onClick={() => go(step.screen)}
            key={step.label}
          />
        ))}
      </nav>
    </>
  );
}

function Home({
  go,
  onStartPrinting,
  onQuickPrint,
  order,
  onCancelOrder,
}: {
  go: (screen: Screen) => void;
  onStartPrinting: () => void;
  onQuickPrint: (preset: PrintJob) => void;
  order: ActiveOrder | null;
  onCancelOrder: () => boolean;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [showTokenScrollHint, setShowTokenScrollHint] = useState(false);
  const homeRef = useRef<HTMLElement | null>(null);
  const homeTokenRef = useRef<HTMLElement | null>(null);
  const canCancel = order?.status === "queued";
  const confirmCancel = () => {
    if (onCancelOrder()) {
      setCancelMessage("Your print order has been cancelled successfully.");
    } else {
      setCancelMessage("This order can no longer be cancelled. Please refresh your order status.");
    }
    setShowCancelDialog(false);
  };

  useEffect(() => {
    const updateTokenHint = () => {
      const tokenBounds = homeTokenRef.current?.getBoundingClientRect();
      const scrollRoot = document.scrollingElement;
      const hasMoreContent = !!scrollRoot && scrollRoot.scrollHeight > window.innerHeight + 1;
      const scrollTop = scrollRoot?.scrollTop ?? window.scrollY;
      const isAtTop = scrollTop <= 1;
      const navigationTop = window.innerHeight - 82;
      setShowTokenScrollHint(Boolean(order && tokenBounds && hasMoreContent && isAtTop && tokenBounds.top > navigationTop));
    };
    updateTokenHint();
    window.addEventListener("scroll", updateTokenHint, { passive: true });
    window.addEventListener("resize", updateTokenHint);
    const resizeObserver = typeof ResizeObserver === "undefined" || !homeRef.current
      ? null
      : new ResizeObserver(updateTokenHint);
    if (homeRef.current) resizeObserver?.observe(homeRef.current);
    return () => {
      window.removeEventListener("scroll", updateTokenHint);
      window.removeEventListener("resize", updateTokenHint);
      resizeObserver?.disconnect();
    };
  }, [order, cancelMessage]);
  return (
    <main className="home page" ref={homeRef}>
      <div className="home-top">
        <div>
          <h1>Hey Mehul,</h1>
          <p>Need to print something today?</p>
        </div>
      </div>

      <section className="hero">
        <div className="hero-orb" />
        <h2>Let’s print something!</h2>
        <p>Upload your document and get it printed quickly.</p>
        <StartPrintingButton onClick={onStartPrinting} />
      </section>

      <div className="section-title-row">
        <h2>Quick Print</h2>
      </div>
      <section className="quick-grid">
        {quickPrints.map((item) => (
          <QuickPrintCard
            title={item.title}
            detail={item.detail}
            icon={item.icon}
            onClick={() => onQuickPrint(item.preset)}
            key={item.title}
          />
        ))}
      </section>

      {order && (
        <section className="home-token-section" ref={homeTokenRef} aria-label="Pickup token">
          <TokenCard
            onClick={() => go("token")}
            token={order.token}
            fileName={order.job.fileName}
            pages={order.job.pages}
            colour={order.job.colour}
            status={orderStatusLabels[order.status]}
          />
          {canCancel && <button className="home-cancel-order" onClick={() => { setCancelMessage(""); setShowCancelDialog(true); }}>Cancel Print Order</button>}
          {cancelMessage && <p className={`cancel-order-message${order.status === "cancelled" ? " success" : " error"}`} role="status" aria-live="polite">{cancelMessage}</p>}
          {order.status === "cancelled" && !cancelMessage && <p className="cancel-order-message success" role="status" aria-live="polite">Order {order.token} cancelled</p>}
        </section>
      )}
      {showTokenScrollHint && !showCancelDialog && (
        <div className="home-token-scroll-hint" aria-hidden="true">
          <span>Scroll down to view your pickup token</span>
          <svg viewBox="0 0 20 20" focusable="false"><path d="M10 3v12m-5-5 5 5 5-5" /></svg>
        </div>
      )}
      {showCancelDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCancelDialog(false); }}>
          <section className="cancel-order-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title" aria-describedby="cancel-order-copy">
            <h2 id="cancel-order-title">Cancel Print Order?</h2>
            <p id="cancel-order-copy">Are you sure you want to cancel your current print order?</p>
            <div className="cancel-order-dialog-actions">
              <button onClick={() => setShowCancelDialog(false)}>Keep Order</button>
              <button className="danger" onClick={confirmCancel}>Yes, Cancel Order</button>
            </div>
          </section>
        </div>
      )}
      <BottomNavigation
        active="home"
        onHome={() => go("home")}
        onHistory={() => go("history")}
        onNotifications={() => go("notifications")}
        onProfile={() => go("profile")}
      />
    </main>
  );
}

function FilePreview({
  previewData,
  page,
  totalPages,
  colour,
  fileName,
  applyChanges = false,
}: {
  previewData: FilePreviewData;
  page: number;
  totalPages: number;
  colour: boolean;
  fileName: string;
  applyChanges?: boolean;
}) {
  const previewClass = applyChanges && !colour ? " black-and-white-preview" : "";
  const isImage = previewData?.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewData?.name ?? "");
  const isPdf = previewData?.type === "application/pdf" || /\.pdf$/i.test(previewData?.name ?? "");

  if (previewData && isImage) {
    return <img className={`uploaded-preview-image${previewClass}`} src={previewData.url} alt={`Preview of ${previewData.name}`} />;
  }

  if (previewData && isPdf) {
    return (
      <object className={`uploaded-preview-document${previewClass}`} data={previewData.url} type="application/pdf" aria-label={`Preview of ${previewData.name}`}>
        <PaperPreview page={page} totalPages={totalPages} colour={colour} fileName={previewData.name} applyChanges={applyChanges} />
      </object>
    );
  }

  return <PaperPreview page={page} totalPages={totalPages} colour={colour} fileName={previewData?.name ?? fileName} applyChanges={applyChanges} />;
}

function DocumentPreview({
  close,
  totalPages,
  previewData,
  fileName,
  originalJob,
  updatedJob,
  hasChanges,
  initialVersion,
}: {
  close: () => void;
  totalPages: number;
  previewData: FilePreviewData;
  fileName: string;
  originalJob: PrintJob;
  updatedJob: PrintJob;
  hasChanges: boolean;
  initialVersion: "original" | "updated";
}) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState<"original" | "updated">(initialVersion);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const isUpdated = version === "updated" && hasChanges;
  const activeJob = isUpdated ? updatedJob : originalJob;
  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(close, reduceMotion ? 0 : 160);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div className={`modal-backdrop${isClosing ? " is-closing" : ""}`} onClick={requestClose}>
      <section className={`preview-modal${isClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" onClick={(event) => event.stopPropagation()}>
        <header className="preview-modal-header">
          <h2 id="preview-dialog-title">Document Preview</h2>
          <button type="button" className="preview-close-button" onClick={requestClose} disabled={isClosing} aria-label="Close preview">×</button>
        </header>
        {hasChanges && (
          <div className="preview-version-switch" role="tablist" aria-label="Preview version">
            <button className={!isUpdated ? "active" : ""} role="tab" aria-selected={!isUpdated} onClick={() => setVersion("original")}>Original</button>
            <button className={isUpdated ? "active" : ""} role="tab" aria-selected={isUpdated} onClick={() => setVersion("updated")}>Updated</button>
          </div>
        )}
        <p className="preview-version-caption">
          {isUpdated
            ? `Updated preview · ${activeJob.colour ? "Full Colour" : "Black & White"} · ${activeJob.singleSided ? "Single-sided" : "Double-sided"}`
            : "Original file · formatting preserved"}
        </p>
        <div className="modal-file-preview">
          <FilePreview previewData={previewData} page={page} totalPages={totalPages} colour={isUpdated ? activeJob.colour : true} fileName={fileName} applyChanges={isUpdated} />
        </div>
        <div className="page-controls">
          <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Prev Page</button>
          <b>{page} / {totalPages}</b>
          <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next Page →</button>
        </div>
      </section>
    </div>
  );
}

function PaperPreview({ page = 1, totalPages = 12, colour, fileName = "Document", applyChanges = false }: { page?: number; totalPages?: number; colour: boolean; fileName?: string; applyChanges?: boolean }) {
  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return (
    <div className={`paper${applyChanges && !colour ? " black-and-white-preview" : ""}`}>
      <div className="paper-title">{title}</div>
      <i /><i /><i /><i />
      <small>PRINT DOCUMENT</small><small>Page {page} of {totalPages}</small>
    </div>
  );
}

function UploadProgress({ fileName, onComplete }: { fileName: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const nextProgress = Math.min(100, Math.round(((Date.now() - startedAt) / 4000) * 100));
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(timer);
        onComplete();
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="upload-progress-card" role="status" aria-live="polite">
      <div className="upload-progress-file">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 3.75h7l5 5V20a.75.75 0 0 1-.75.75h-11.5A.75.75 0 0 1 5 20V4.5a.75.75 0 0 1 .75-.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13 4v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span>{fileName}</span>
      </div>
      <div className="upload-progress-label">
        <span className="upload-progress-status">
          {progress >= 100 && <i aria-hidden="true">✓</i>}
          {progress < 100 ? "Uploading file" : "Upload complete"}
        </span>
        <span className="upload-progress-percent">{progress}%</span>
      </div>
      <div
        className={`upload-progress-track${progress >= 100 ? " complete" : ""}`}
        role="progressbar"
        aria-label={`Upload progress for ${fileName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Document({
  go,
  preview,
  job,
  setJob,
  previewData,
  setPreviewData,
  setOriginalPrintJob,
  resetPreviewHistory,
  uploadedFiles,
  setUploadedFiles,
  hasFile,
  setHasFile,
}: {
  go: (screen: Screen) => void;
  preview: () => void;
  job: PrintJob;
  setJob: (job: PrintJob) => void;
  previewData: FilePreviewData;
  setPreviewData: (preview: FilePreviewData) => void;
  setOriginalPrintJob: (job: PrintJob) => void;
  resetPreviewHistory: () => void;
  uploadedFiles: UploadedFileData[];
  setUploadedFiles: (files: UploadedFileData[]) => void;
  hasFile: boolean;
  setHasFile: (hasFile: boolean) => void;
}) {
  const [uploadComplete, setUploadComplete] = useState(false);
  const [applyingSample, setApplyingSample] = useState<string | null>(null);
  const [uploadRunId, setUploadRunId] = useState(0);
  const uploadRunIdRef = useRef(0);
  const sampleTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (sampleTimerRef.current !== null) window.clearTimeout(sampleTimerRef.current);
  }, []);
  const samples = [
    defaultPrintJob,
    quickPrints[1].preset,
    quickPrints[2].preset,
  ];
  const uploadFiles = async (selectedFiles?: FileList) => {
    const files = Array.from(selectedFiles ?? []);
    if (files.length === 0) return;

    uploadRunIdRef.current += 1;
    setUploadRunId(uploadRunIdRef.current);
    setUploadComplete(false);
    const uploaded = await Promise.all(files.map((selected) => new Promise<UploadedFileData>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        url: String(reader.result),
        type: selected.type,
        name: selected.name,
        size: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
      });
      reader.onerror = () => resolve({
        url: "",
        type: selected.type,
        name: selected.name,
        size: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
      });
      reader.readAsDataURL(selected);
    })));
    const allFiles = [...uploadedFiles, ...uploaded];
    const activeFile = uploaded[uploaded.length - 1];
    setUploadedFiles(allFiles);
    setPreviewData(activeFile);
    resetPreviewHistory();
    const uploadedJob = {
      ...job,
      title: allFiles.length > 1 ? "Uploaded Documents" : "Uploaded Document",
      fileName: activeFile.name,
      fileSize: activeFile.size,
      pages: allFiles.length,
    };
    setJob(uploadedJob);
    setOriginalPrintJob(uploadedJob);
    setHasFile(true);
  };
  const selectSample = (sample: PrintJob) => {
    if (sampleTimerRef.current !== null) window.clearTimeout(sampleTimerRef.current);
    const keepsUploadedFile = Boolean(previewData || uploadedFiles.length);
    const nextJob = keepsUploadedFile
      ? { ...job, ...sample, title: sample.title, fileName: job.fileName, fileSize: job.fileSize, pages: job.pages }
      : { ...sample };
    setApplyingSample(sample.title);
    sampleTimerRef.current = window.setTimeout(() => {
      setJob(nextJob);
      setHasFile(true);
      setUploadComplete(true);
      if (!keepsUploadedFile) {
        setPreviewData(null);
        setUploadedFiles([]);
        setOriginalPrintJob(nextJob);
        resetPreviewHistory();
      }
      setApplyingSample(null);
      sampleTimerRef.current = null;
    }, 1200);
  };
  const removeUploadedFile = (index: number) => {
    const remaining = uploadedFiles.filter((_, fileIndex) => fileIndex !== index);
    const removedFile = uploadedFiles[index];
    const removedActiveFile = previewData?.url === removedFile?.url;
    setUploadedFiles(remaining);

    if (remaining.length === 0) {
      setHasFile(false);
      setPreviewData(null);
      setUploadComplete(false);
      return;
    }

    const activeFile = removedActiveFile
      ? remaining[Math.min(index, remaining.length - 1)]
      : uploadedFiles.find((file) => file.url === previewData?.url) ?? remaining[0];
    if (removedActiveFile) {
      setPreviewData(activeFile);
      setUploadComplete(true);
    }
    setJob({
      ...job,
      title: remaining.length > 1 ? "Uploaded Documents" : "Uploaded Document",
      fileName: activeFile.name,
      fileSize: activeFile.size,
      pages: remaining.length,
    });
  };
  return (
    <main className="studio page">
      <StepHeader active={1} go={go} close={() => go("home")} />
      <h2>File info</h2>
      <div className="file-card completed-file">
        <Asset name="6e532.svg" />
        <span>
          <b>{hasFile ? job.fileName : "No document selected"}</b>
          <small>{hasFile ? `${job.pages} pages · ${job.fileSize} · ${job.title}` : "Upload a document to continue"}</small>
        </span>
      </div>
      {uploadedFiles.length > 1 && (
        <section className="uploaded-document-list" aria-label="Uploaded documents">
          {uploadedFiles.map((file, index) => (
            <div className={`uploaded-document-row${previewData?.url === file.url ? " active" : ""}`} key={`${file.name}-${file.size}-${index}`}>
              <button
                className="uploaded-document-select"
                aria-label={`Preview ${file.name}`}
                onClick={() => {
                  setPreviewData(file);
                  setUploadComplete(true);
                  resetPreviewHistory();
                  const activeJob = { ...job, title: uploadedFiles.length > 1 ? "Uploaded Documents" : "Uploaded Document", fileName: file.name, fileSize: file.size, pages: uploadedFiles.length };
                  setJob(activeJob);
                  setOriginalPrintJob(activeJob);
                }}
              >
                <Asset name="6e532.svg" />
                <span><b>{file.name}</b><small>{file.size}</small></span>
              </button>
              <button className="uploaded-document-remove" aria-label={`Delete ${file.name}`} onClick={() => removeUploadedFile(index)}>
                <Asset name="986ce.svg" />
              </button>
            </div>
          ))}
        </section>
      )}
      {hasFile && previewData && (
        <UploadProgress
          key={uploadRunId}
          fileName={previewData.name}
          onComplete={() => {
            if (uploadRunId === uploadRunIdRef.current) setUploadComplete(true);
          }}
        />
      )}
      <div className="file-actions">
        <label className="file-action-button">
          <Asset name="4dcbe.svg" />
          <span>Upload File</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
            onChange={(event) => {
              void uploadFiles(event.target.files ?? undefined);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button
          className="file-action-button delete"
          onClick={() => {
            setHasFile(false);
            setPreviewData(null);
            setUploadedFiles([]);
            setUploadComplete(false);
          }}
          disabled={!hasFile}
        >
          <Asset name="986ce.svg" />
          Delete All Files
        </button>
      </div>
      <label className="micro-label">Quick Sample Documents</label>
      <div className="samples">
        {samples.map((sample) => (
          <button onClick={() => selectSample(sample)} key={sample.title} disabled={applyingSample !== null}>
            {applyingSample === sample.title ? `Applying ${sample.title}…` : `${sample.title} (${sample.pages}p)`}
          </button>
        ))}
      </div>
      {applyingSample && <p className="sample-conversion-status" role="status">Applying {applyingSample} format to your document…</p>}
      <h2>Live Document Preview</h2>
      <button className="preview-box" onClick={preview} aria-label="Open document preview" disabled={!hasFile || applyingSample !== null || (!!previewData && !uploadComplete)}>
        {applyingSample ? (
          <span className="preview-processing">
            <Asset name="6e532.svg" />
            <b>Preparing {applyingSample} preview</b>
            <small>Your original file stays unchanged.</small>
          </span>
        ) : hasFile && previewData && !uploadComplete ? (
          <span className="preview-processing">
            <Asset name="6e532.svg" />
            <b>Preparing your preview</b>
            <small>It will appear when the upload is complete.</small>
          </span>
        ) : hasFile ? (
          <FilePreview previewData={previewData} page={1} totalPages={job.pages} colour={job.colour} fileName={job.fileName} />
        ) : (
          <span className="empty-preview"><Asset name="4dcbe.svg" /><b>Upload a file to see its preview</b></span>
        )}
      </button>
      <PriceBar action="Continue To Setup" onClick={() => go("setup")} job={job} disabled={!hasFile} empty={!hasFile} />
    </main>
  );
}

function Choice({
  active,
  title,
  detail,
  price,
  icon,
  onClick,
}: {
  active?: boolean;
  title: string;
  detail: string;
  price?: string;
  icon?: string;
  onClick?: () => void;
}) {
  return (
    <button className={`choice ${active ? "active" : ""}`} onClick={onClick}>
      {icon && <Asset name={icon} />}
      <b>{title}</b>
      {price && <strong>{price}</strong>}
      <small>{detail}</small>
    </button>
  );
}

function PriceBar({
  action,
  onClick,
  job,
  disabled = false,
  empty = false,
}: {
  action: string;
  onClick: () => void;
  job: PrintJob;
  disabled?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="price-bar">
      <span>
        <strong className="price-value" key={empty ? "empty" : formatPrice(job)}>{empty ? "₹0.00" : formatPrice(job)}</strong>
        <small>{empty ? "Upload a document" : `${job.pages} pages · ${job.paper} · ${job.colour ? "Colour" : "B&W"}`}</small>
      </span>
      <ContinueButton label={action} onClick={onClick} disabled={disabled} />
    </div>
  );
}

function Setup({
  go,
  job,
  setJob,
}: {
  go: (screen: Screen) => void;
  job: PrintJob;
  setJob: (job: PrintJob) => void;
}) {
  return (
    <main className="studio page">
      <StepHeader active={2} go={go} close={() => go("home")} />
      <h2>Print Option</h2>
      <div className="two-grid tall">
        <PrintOptionCard active={!job.colour} title="Black & White" price="₹2.00 / page" detail="Standard print for assignments & docs" icon="f1ae6.svg" activeIcon="0b6b4.svg" onClick={() => setJob({ ...job, colour: false, pricePerPage: 2 })} />
        <PrintOptionCard active={job.colour} title="Full Colour" price="₹8.00 / page" detail="Standard print for assignments & documents" icon="ad9cf.svg" activeIcon="bcf58.svg" onClick={() => setJob({ ...job, colour: true, pricePerPage: 8 })} />
      </div>
      <h2>Printing Side</h2>
      <div className="two-grid">
        <SelectionCard active={!job.singleSided} title="Double Sided" detail="Eco-Friendly (Save 50% Paper)" icon="d1b10.svg" activeIcon="0b6b4.svg" onClick={() => setJob({ ...job, singleSided: false, sideSurcharge: 0 })} />
        <SelectionCard active={job.singleSided} title="Single Sided" detail="Clean Document (+₹1/page)" icon="44881.svg" activeIcon="b9277.svg" onClick={() => setJob({ ...job, singleSided: true, sideSurcharge: 1 })} />
      </div>
      <h2>Paper Size</h2>
      <PaperSizeSelector
        selected={job.paper}
        onSelect={(paper, paperSurcharge) => setJob({ ...job, paper, paperSurcharge })}
      />
      <PriceBar action="Continue" onClick={() => go("finishing")} job={job} />
    </main>
  );
}

function Finishing({
  go,
  job,
  setJob,
}: {
  go: (screen: Screen) => void;
  job: PrintJob;
  setJob: (job: PrintJob) => void;
}) {
  const [speed, setSpeed] = useState("10 min");
  return (
    <main className="studio page">
      <StepHeader active={3} go={go} close={() => go("home")} />
      <h2>Paper Material & Stock</h2>
      <PaperStockGrid
        selected={job.stockIndex}
        onSelect={(stockIndex, stockSurcharge) => setJob({ ...job, stockIndex, stockSurcharge })}
      />
      <h2>When would you like to collect it?</h2>
      <div className="four-grid speed-grid">
        {[["10 min", "After print 10 min"], ["30 min", "After print 30 min"], ["1 hour", "After print 1 Hour"], ["2 hour", "After print 2 hour"]].map(([title, detail]) => (
          <Choice key={title} active={speed === title} title={title} detail={detail} onClick={() => setSpeed(title)} />
        ))}
      </div>
      <h2>Number of Copies</h2>
      <div className="counter">
        <button onClick={() => setJob({ ...job, copies: Math.max(1, job.copies - 1) })}>−</button>
        <strong>{job.copies}</strong>
        <button onClick={() => setJob({ ...job, copies: job.copies + 1 })}>+</button>
        <small>{job.copies === 1 ? "copy set" : "copy sets"}</small>
        <em>{job.pages} pages in each set</em>
      </div>
      <PriceBar action="Continue" onClick={() => go("checkout")} job={job} />
    </main>
  );
}

function Checkout({
  go,
  preview,
  job,
  onOrderConfirmed,
}: {
  go: (screen: Screen) => void;
  preview: () => void;
  job: PrintJob;
  onOrderConfirmed: () => void;
}) {
  const [payment, setPayment] = useState<"UPI" | "Cash">("UPI");
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "success">("idle");
  const [paymentProgress, setPaymentProgress] = useState(0);

  useEffect(() => {
    if (paymentState !== "processing") return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const nextProgress = Math.min(100, Math.round(((Date.now() - startedAt) / 4000) * 100));
      setPaymentProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(timer);
        setPaymentState("success");
        onOrderConfirmed();
        go("paymentSuccess");
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [paymentState, onOrderConfirmed]);

  return (
    <main className="studio page">
      <StepHeader active={4} go={go} close={() => go("home")} />
      <section className="details-card">
        <h2>Print Details</h2>
        <h3><Asset name="29341.svg" /> {job.fileName}</h3>
        <p className="muted indent">{job.title}</p>
        <dl>
          <dt>Pages & Copies</dt><dd>{job.pages} pages × {job.copies} {job.copies === 1 ? "copy" : "copies"}</dd>
          <dt>Print Mode</dt><dd>{job.colour ? "Full Colour" : "Black & White"} (₹{job.pricePerPage}/page)</dd>
          <dt>Paper Specs</dt><dd>{job.paper}{job.paperSurcharge ? ` (+₹${job.paperSurcharge}/page)` : ""} · {job.singleSided ? "Single-sided (+₹1/page)" : "Duplex"}</dd>
          <dt>Paper Stock</dt><dd>{job.stockSurcharge ? `+₹${job.stockSurcharge}/page` : "Standard"}</dd>
          <dt>Binding</dt><dd>No Binding (Free)</dd>
          <dt>Total Payable Amount</dt><dd>{formatPrice(job)}</dd>
        </dl>
      </section>
      <h2>Preview of file</h2>
      <button className="file-card preview-file" onClick={preview}>
        <span><b>{job.fileName}</b><small>{job.pages} pages · {job.fileSize} · {job.title}</small></span>
        <svg className="preview-eye-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {paymentState === "idle" ? (
        <>
          <h2 className="payment-title">Select Payment Method</h2>
          <PaymentSelector selected={payment} onSelect={setPayment} />
          <button
            className="pay-button"
            onClick={() => {
              setPaymentProgress(0);
              setPaymentState("processing");
            }}
          >
            Pay {formatPrice(job)} & Place Order
          </button>
        </>
      ) : (
        <section className={`payment-feedback${paymentState === "success" ? " success" : ""}`} role="status" aria-live="polite">
          {paymentState === "processing" ? (
            <>
              <span className="payment-feedback-spinner" aria-hidden="true" />
              <h2>Processing your {payment === "UPI" ? "payment" : "order"}</h2>
              <p>Please wait while we confirm your order.</p>
              <div className="upload-progress-label">
                <span>{payment === "UPI" ? "Processing payment" : "Placing order"}</span>
                <span className="upload-progress-percent">{paymentProgress}%</span>
              </div>
              <div className="upload-progress-track" role="progressbar" aria-label="Payment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={paymentProgress}>
                <div className="upload-progress-fill" style={{ width: `${paymentProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span className="payment-success-icon" aria-hidden="true">✓</span>
              <h2>{payment === "UPI" ? "Payment successful" : "Order placed successfully"}</h2>
              <p>{payment === "UPI" ? "Your print order is confirmed." : "Pay at the counter when you collect your prints."}</p>
              <button className="pay-button" onClick={() => go("token")}>View Pickup Token</button>
            </>
          )}
        </section>
      )}
    </main>
  );
}

function PaymentSuccess({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="page payment-success-page">
      <section className="payment-success-card" role="status">
        <span className="payment-success-icon" aria-hidden="true">✓</span>
        <p className="payment-success-eyebrow">Order confirmation</p>
        <h1>Payment successful</h1>
        <p className="payment-success-copy">Your print order is confirmed.</p>
        <button className="pay-button" onClick={() => go("token")}>View Pickup Token</button>
      </section>
    </main>
  );
}

function Token({ go, order, onCancelOrder }: { go: (screen: Screen) => void; order: ActiveOrder; onCancelOrder: () => boolean }) {
  const tokenContentRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{ startY: number; lastY: number; startTime: number; mode: "pending" | "dragging" | "scroll" } | null>(null);
  const returnTimerRef = useRef<number | null>(null);
  const [returningHome, setReturningHome] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cancelled = order.status === "cancelled";
  const canCancel = order.status === "queued";
  const job = order.job;
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const confirmCancel = () => {
    if (!canCancel || !onCancelOrder()) {
      setCancelError("This order can no longer be cancelled.");
      setShowCancelDialog(false);
      return;
    }
    setShowCancelDialog(false);
    go("home");
  };
  useEffect(() => {
    const content = tokenContentRef.current;
    if (!content) return;
    const resetGesture = () => {
      gestureRef.current = null;
      setIsDragging(false);
      setDragY(0);
    };
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || returningHome) return;
      const y = event.touches[0].clientY;
      gestureRef.current = { startY: y, lastY: y, startTime: performance.now(), mode: "pending" };
    };
    const onMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || event.touches.length !== 1 || gesture.mode === "scroll") return;
      const y = event.touches[0].clientY;
      const delta = y - gesture.startY;
      if (gesture.mode === "pending" && Math.abs(delta) > 8) {
        if (delta < 0 || window.scrollY > 0) {
          gesture.mode = "scroll";
          return;
        }
        gesture.mode = "dragging";
        setIsDragging(true);
      }
      if (gesture.mode === "dragging" && delta > 0 && window.scrollY <= 0) {
        event.preventDefault();
        gesture.lastY = y;
        setDragY(delta <= 160 ? delta : 160 + (delta - 160) * 0.18);
      }
    };
    const finish = (endY: number) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture || gesture.mode !== "dragging") { resetGesture(); return; }
      const distance = Math.max(0, endY - gesture.startY);
      const velocity = distance / Math.max(1, performance.now() - gesture.startTime);
      const shouldReturn = window.scrollY <= 0 && (distance >= 105 || (distance >= 45 && velocity >= 0.7));
      setIsDragging(false);
      if (!shouldReturn) { setDragY(0); return; }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReturningHome(true);
      setDragY(reduced ? 0 : Math.max(140, distance));
      if (returnTimerRef.current !== null) window.clearTimeout(returnTimerRef.current);
      returnTimerRef.current = window.setTimeout(() => go("home"), reduced ? 0 : 220);
    };
    const onEnd = (event: TouchEvent) => finish(event.changedTouches[0]?.clientY ?? gestureRef.current?.lastY ?? 0);
    const onCancel = () => resetGesture();
    content.addEventListener("touchstart", onStart, { passive: true });
    content.addEventListener("touchmove", onMove, { passive: false });
    content.addEventListener("touchend", onEnd, { passive: true });
    content.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      content.removeEventListener("touchstart", onStart);
      content.removeEventListener("touchmove", onMove);
      content.removeEventListener("touchend", onEnd);
      content.removeEventListener("touchcancel", onCancel);
      if (returnTimerRef.current !== null) window.clearTimeout(returnTimerRef.current);
    };
  }, [go]);
  return (
    <main className="page token-page has-fixed-actions">
      <div
        ref={tokenContentRef}
        className={`token-content${isDragging ? " is-dragging" : ""}${returningHome ? " is-returning-home" : ""}`}
        style={{ transform: returningHome ? "translateY(110vh)" : `translateY(${dragY}px)` }}
        role="group"
        aria-label="Pickup token and order tracking. Drag down to return home."
      >
      <div className="token-swipe-instruction" aria-label="Swipe down to return home">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v13m-5-5 5 5 5-5" /></svg>
        <span>Swipe down to return home</span>
      </div>
      <div className="home-top">
        <div><h1>Hey Mehul,</h1><p>Need to print something today?</p></div>
      </div>
      <div className="token-return-zone">
        <div className="receipt-handle" />
        <section className="pickup-card" aria-label="Pickup token">
          <h2>Your Pickup Token</h2><strong>{order.token}</strong>
          <p>{job.fileName} · {job.pages} pages ({job.colour ? "Colour" : "B&W"})</p><h3>{cancelled ? "Order Cancelled" : `Order ${orderStatusLabels[order.status]}`}</h3>
          {cancelled && <small className="token-cancel-status" role="status">Your print order has been cancelled.</small>}
        </section>
      </div>
      <section className="track-card">
        <h2>Order Tracking</h2>
        {[
          { title: "Queued", detail: "Token assigned in queue", icon: "39cf5.svg" },
          { title: "Printing", detail: "Your order is printing on Printer 3.", icon: "fc492.svg" },
          { title: "Ready", detail: "Your order is ready", icon: "057e9.svg" },
          { title: "Pick up", detail: "Your order is waiting for pickup.", icon: "pickup.svg" },
         ].map(({ title, detail, icon }, index) => (
          <div className={`track-step${cancelled ? " is-cancelled" : index <= ["queued", "printing", "ready", "pickup"].indexOf(order.status) ? " is-complete" : ""}`} key={title}>
            <span aria-hidden="true"><Asset name={icon} /></span>
            <div><b>{title}</b><small>{cancelled ? "Order cancelled before completion." : detail}</small></div>
          </div>
        ))}
      </section>
      </div>
      <div className="token-fixed-actions">
        <button className="token-home-button" onClick={() => go("home")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10.5 8.5-7 8.5 7M5.5 9v11h13V9M9.5 20v-6h5v6" /></svg>
          Home
        </button>
        <button className={`token-cancel-button${canCancel ? "" : " is-unavailable"}`} onClick={() => { setCancelError(""); setShowCancelDialog(true); }} disabled={!canCancel}>
          {cancelled ? "Order Cancelled" : "Cancel Order"}
        </button>
      </div>
      {cancelError && <p className="token-cancel-error" role="alert">{cancelError}</p>}
      {!canCancel && !cancelled && <p className="token-cancel-status token-cannot-cancel">Cannot cancel, printing has started.</p>}
      {showCancelDialog && (
        <div className="modal-backdrop" role="presentation">
          <section className="cancel-order-dialog" role="alertdialog" aria-modal="true" aria-labelledby="token-cancel-title" aria-describedby="token-cancel-copy">
            <h2 id="token-cancel-title">Cancel this order?</h2>
            <p id="token-cancel-copy">This cannot be undone.</p>
            <div className="cancel-order-dialog-actions">
              <button className="danger" onClick={confirmCancel}>Yes, Cancel</button>
              <button onClick={() => setShowCancelDialog(false)}>No, Keep Order</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Notifications({
  go,
  items,
  onCheckClosing,
}: {
  go: (screen: Screen) => void;
  items: AppNotification[];
  onCheckClosing: (status: ShopStatus) => void;
}) {
  const [shopStatus, setShopStatus] = useState<ShopStatus>(() => getShopStatus());

  useEffect(() => {
    const updateShopStatus = () => {
      const nextStatus = getShopStatus();
      setShopStatus(nextStatus);
      onCheckClosing(nextStatus);
    };
    updateShopStatus();
    const interval = window.setInterval(updateShopStatus, 1000);
    return () => window.clearInterval(interval);
  }, [onCheckClosing]);

  const todayClosingNotice = items.find((item) => item.kind === "shop-closing" && item.dateKey === shopStatus.dateKey);
  const displayedItems = items.map((item) => {
    if (item !== todayClosingNotice) return item;
    if (shopStatus.state === "closed") {
      return {
        ...item,
        title: "Print Shop Closed",
        detail: `The print shop is closed now. Today's closing time was ${shopStatus.closingTime ?? "not available"}.`,
        shopState: "closed" as const,
      };
    }
    return {
      ...item,
      title: "Print Shop Closing Soon",
      detail: `The print shop is closing soon. Please collect your print order before closing time. Closing Time: ${shopStatus.closingTime}. Time Remaining: ${formatTimeRemaining(shopStatus.remainingMs ?? 0)}.`,
      shopState: "closing-soon" as const,
    };
  });

  return (
    <main className="page list-page">
      <AppHeader title="Notification" onBack={() => go("home")} />
      <p className="shop-status-note" role="status">
        {shopStatus.state === "unavailable"
          ? "Print shop hours are not configured. Closing time is unavailable."
          : shopStatus.state === "closed"
            ? `Print shop is currently closed. Regular closing time: ${shopStatus.closingTime}.`
            : shopStatus.state === "closing-soon"
              ? `Print shop closes at ${shopStatus.closingTime} in ${formatTimeRemaining(shopStatus.remainingMs ?? 0)}.`
              : `Print shop is open. It closes at ${shopStatus.closingTime}.`}
      </p>
      <section className="notification-list">
        {displayedItems.map((item) => (
          item.kind === "shop-closing" ? (
            <button className="notification-card notification-action" type="button" key={item.id} onClick={() => go("token")}>
              <Asset name={item.icon} />
              <span><b>{item.title}</b><small>{item.detail}</small></span>
              <time>{item.time}</time>
            </button>
          ) : (
            <article className="notification-card" key={item.id}>
              <Asset name={item.icon} />
              <span><b>{item.title}</b><small>{item.detail}</small></span>
              <time>{item.time}</time>
            </article>
          )
        ))}
      </section>
      <BottomNavigation
        active="notifications"
        onHome={() => go("home")}
        onHistory={() => go("history")}
        onNotifications={() => go("notifications")}
        onProfile={() => go("profile")}
      />
    </main>
  );
}

function History({ go, activeOrder }: { go: (screen: Screen) => void; activeOrder: ActiveOrder | null }) {
  const historyOrders = activeOrder
    ? orders.map((item) => item.token === activeOrder.token
      ? {
        ...item,
        file: activeOrder.job.fileName,
        meta: `${activeOrder.job.pages} pages · ${activeOrder.job.copies} ${activeOrder.job.copies === 1 ? "copy" : "copies"} · ${activeOrder.job.paper} · ${activeOrder.job.colour ? "Colour" : "Black & White"} · ${activeOrder.job.singleSided ? "Single-sided" : "Double-sided"}`,
        price: formatPrice(activeOrder.job),
        status: activeOrder.status === "cancelled" ? "Cancelled" : "Pending",
      }
      : item)
    : orders;
  return (
    <main className="page list-page">
      <AppHeader title="History" onBack={() => go("home")} />
      <section className="history-list">
        {historyOrders.map((order) => (
          <article className="history-card" key={order.token}>
            <b>Token {order.token}</b><strong>{order.status}</strong>
            <h2>{order.file}</h2><p>{order.meta}</p><h3>{order.price}</h3>
            <button onClick={() => go("document")}><Asset name={order.icon} />{order.action}</button>
          </article>
        ))}
      </section>
      <BottomNavigation
        active="history"
        onHome={() => go("home")}
        onHistory={() => go("history")}
        onNotifications={() => go("notifications")}
        onProfile={() => go("profile")}
      />
    </main>
  );
}

function Profile({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="page account-page">
      <AppHeader title="Profile" onBack={() => go("home")} />
      <section className="profile-summary">
        <span><img src={`${A}/profile-mehul.jpg`} alt="Mehul Patel" /></span>
        <div><h2>Mehul Patel</h2><p>mehul.patel@campus.edu</p><small>Campus Print Member</small></div>
      </section>
      <section className="account-menu" aria-label="Profile options">
        <MenuRow icon="6aaa0.svg" title="Settings" detail="Printing preferences and app settings" onClick={() => go("settings")} />
        <MenuRow icon="8c0b7.svg" title="Notifications" detail="Order and print-shop updates" onClick={() => go("notifications")} />
        <MenuRow icon="2ab15.svg" title="Print History" detail="Previous and active print orders" onClick={() => go("history")} />
        <MenuRow icon="0bcda.svg" title="Help & Support" detail="FAQs and contact information" onClick={() => go("help")} />
        <MenuRow icon="678a9.svg" title="Sign Out" onClick={() => go("login")} danger />
      </section>
      <BottomNavigation
        active="profile"
        onHome={() => go("home")}
        onHistory={() => go("history")}
        onNotifications={() => go("notifications")}
        onProfile={() => go("profile")}
      />
    </main>
  );
}

function Settings({ go }: { go: (screen: Screen) => void }) {
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [shopUpdates, setShopUpdates] = useState(true);
  const [compactPreview, setCompactPreview] = useState(false);
  return (
    <main className="page account-page">
      <AppHeader title="Settings" onBack={() => go("profile")} />
      <section className="settings-section">
        <h2>Notifications</h2>
        <div className="setting-row">
          <span><b>Order updates</b><small>Queued, printing, and pickup alerts</small></span>
          <button className={`switch ${orderUpdates ? "active" : ""}`} onClick={() => setOrderUpdates(!orderUpdates)} aria-label="Toggle order updates"><i /></button>
        </div>
        <div className="setting-row">
          <span><b>Print shop updates</b><small>Opening hours and service notices</small></span>
          <button className={`switch ${shopUpdates ? "active" : ""}`} onClick={() => setShopUpdates(!shopUpdates)} aria-label="Toggle print shop updates"><i /></button>
        </div>
      </section>
      <section className="settings-section">
        <h2>Printing</h2>
        <div className="setting-row">
          <span><b>Compact document preview</b><small>Use a smaller preview on Android devices</small></span>
          <button className={`switch ${compactPreview ? "active" : ""}`} onClick={() => setCompactPreview(!compactPreview)} aria-label="Toggle compact preview"><i /></button>
        </div>
        <MenuRow icon="0b6b4.svg" title="Default Print Options" detail="Black & white, double-sided, A4" onClick={() => go("setup")} />
      </section>
    </main>
  );
}

function Help({ go }: { go: (screen: Screen) => void }) {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const questions = [
    ["How do I upload a document?", "Open Print Studio, select the upload icon, and choose a PDF, presentation, document, or image from your device."],
    ["When can I collect my print?", "Your pickup time appears during setup. We will also notify you when the order is ready."],
    ["Can I cancel an order?", "You can cancel an order from the tracking screen before the print shop starts processing it."],
  ];
  return (
    <main className="page account-page">
      <AppHeader title="Help & Support" onBack={() => go("profile")} />
      <section className="help-hero">
        <Asset name="0bcda.svg" />
        <div><h2>How can we help?</h2><p>Find answers about uploading, payment, and pickup.</p></div>
      </section>
      <section className="faq-list">
        <h2>Frequently Asked Questions</h2>
        {questions.map(([question, answer], index) => (
          <article className={openQuestion === index ? "open" : ""} key={question}>
            <button onClick={() => setOpenQuestion(openQuestion === index ? null : index)}>
              <span>{question}</span><b>{openQuestion === index ? "−" : "+"}</b>
            </button>
            {openQuestion === index && <p>{answer}</p>}
          </article>
        ))}
      </section>
      <section className="support-card">
        <Asset name="fa4b6.svg" />
        <div><b>Campus Print Shop</b><p>Ground Floor, Student Services Building</p><small>Open Monday–Saturday, 8:00 AM–7:00 PM</small></div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [notificationItems, setNotificationItems] = useState<AppNotification[]>(readNotifications);
  const [showPreview, setShowPreview] = useState(false);
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false);
  const [showPreviewComparison, setShowPreviewComparison] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<"original" | "updated">("original");
  const [printJob, setPrintJob] = useState<PrintJob>({ ...defaultPrintJob });
  const [originalPrintJob, setOriginalPrintJob] = useState<PrintJob>({ ...defaultPrintJob });
  const [filePreview, setFilePreview] = useState<FilePreviewData>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [hasDocument, setHasDocument] = useState(false);
  const homeFileInput = useRef<HTMLInputElement>(null);
  const pendingHomePreset = useRef<PrintJob>(defaultPrintJob);
  const confirmOrder = useCallback(() => {
    setActiveOrder({ token: "A-26", job: { ...printJob }, status: "queued" });
  }, [printJob]);
  const cancelActiveOrder = useCallback(() => {
    if (!activeOrder || activeOrder.status !== "queued") return false;
    setActiveOrder((current) => current?.status === "queued" ? { ...current, status: "cancelled" } : current);
    return true;
  }, [activeOrder]);
  useEffect(() => {
    try {
      window.localStorage.setItem(notificationStorageKey, JSON.stringify(notificationItems));
    } catch {
      // Notifications remain available in memory if browser storage is unavailable.
    }
  }, [notificationItems]);

  const checkClosingNotification = useCallback((status: ShopStatus) => {
    if (!status.dateKey) return;
    const id = `shop-closing-${status.dateKey}`;
    if (status.state === "closing-soon") {
      setNotificationItems((current) => current.some((item) => item.id === id)
        ? current
        : [{
          id,
          title: "Print Shop Closing Soon",
          detail: "The print shop is closing soon. Please collect your print order before closing time.",
          time: "Now",
          icon: "fa4b6.svg",
          kind: "shop-closing",
          dateKey: status.dateKey,
          shopState: "closing-soon",
        }, ...current]);
    } else if (status.state === "closed") {
      setNotificationItems((current) => {
        const existing = current.find((item) => item.id === id);
        if (!existing || existing.shopState === "closed") return current;
        return current.map((item) => item.id === id
          ? { ...item, title: "Print Shop Closed", shopState: "closed" }
          : item);
      });
    }
  }, []);
  const hasPreviewChanges = (["colour", "singleSided", "paper", "paperSurcharge", "copies", "stockIndex", "stockSurcharge"] as const)
    .some((key) => printJob[key] !== originalPrintJob[key]);
  const openDocumentPreview = () => {
    const showUpdatedVersion = hasOpenedPreview && hasPreviewChanges;
    setShowPreviewComparison(showUpdatedVersion);
    setPreviewVersion(showUpdatedVersion ? "updated" : "original");
    setHasOpenedPreview(true);
    setShowPreview(true);
  };
  const go = (next: Screen) => {
    setScreen(next);
    // Route changes replace the screen, so a separate smooth scroll competes
    // with the screen transition and can make the new screen jump.
    window.scrollTo(0, 0);
  };

  const openHomeFilePicker = (preset: PrintJob = defaultPrintJob) => {
    pendingHomePreset.current = preset;
    if (homeFileInput.current) {
      homeFileInput.current.value = "";
      homeFileInput.current.click();
    }
  };

  const handleHomeFileSelected = (selected?: File) => {
    if (!selected) return;

    const uploadedJob = {
      ...pendingHomePreset.current,
      title: "Uploaded Document",
      fileName: selected.name,
      fileSize: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
      pages: 1,
    };
    setPrintJob(uploadedJob);
    setOriginalPrintJob(uploadedJob);
    setHasDocument(true);
    setHasOpenedPreview(false);
    setShowPreview(false);

    const reader = new FileReader();
    reader.onload = () => {
      const uploadedFile = {
        url: String(reader.result),
        type: selected.type,
        name: selected.name,
        size: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
      };
      setFilePreview(uploadedFile);
      setUploadedFiles([uploadedFile]);
    };
    reader.readAsDataURL(selected);
    go("document");
  };

  return (
    <div className="app-shell">
      <input
        ref={homeFileInput}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
        hidden
        onChange={(event) => handleHomeFileSelected(event.target.files?.[0])}
      />
      <div className="screen-transition" key={screen}>
        {screen === "login" && <Login go={go} />}
        {screen === "register" && <Register go={go} />}
        {screen === "otp" && <Otp go={go} />}
        {screen === "home" && (
          <Home
            go={go}
            onStartPrinting={() => openHomeFilePicker()}
            onQuickPrint={(preset) => openHomeFilePicker(preset)}
            order={activeOrder}
            onCancelOrder={cancelActiveOrder}
          />
        )}
        {screen === "document" && (
          <Document
            go={go}
            preview={openDocumentPreview}
            job={printJob}
            setJob={setPrintJob}
            previewData={filePreview}
            setPreviewData={setFilePreview}
            setOriginalPrintJob={setOriginalPrintJob}
            resetPreviewHistory={() => setHasOpenedPreview(false)}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            hasFile={hasDocument}
            setHasFile={setHasDocument}
          />
        )}
        {screen === "setup" && <Setup go={go} job={printJob} setJob={setPrintJob} />}
        {screen === "finishing" && <Finishing go={go} job={printJob} setJob={setPrintJob} />}
        {screen === "checkout" && <Checkout go={go} preview={openDocumentPreview} job={printJob} onOrderConfirmed={confirmOrder} />}
        {screen === "paymentSuccess" && <PaymentSuccess go={go} />}
        {screen === "token" && activeOrder && <Token go={go} order={activeOrder} onCancelOrder={cancelActiveOrder} />}
        {screen === "token" && !activeOrder && <main className="page token-page"><AppHeader title="Pickup Token" onBack={() => go("home")} /><p className="empty-order-message">You don’t have an active print order yet.</p></main>}
        {screen === "notifications" && (
          <Notifications go={go} items={notificationItems} onCheckClosing={checkClosingNotification} />
        )}
        {screen === "history" && <History go={go} activeOrder={activeOrder} />}
        {screen === "profile" && <Profile go={go} />}
        {screen === "settings" && <Settings go={go} />}
        {screen === "help" && <Help go={go} />}
      </div>
      {showPreview && <DocumentPreview close={() => setShowPreview(false)} totalPages={printJob.pages} previewData={filePreview} fileName={printJob.fileName} originalJob={originalPrintJob} updatedJob={printJob} hasChanges={showPreviewComparison} initialVersion={previewVersion} />}
    </div>
  );
}
