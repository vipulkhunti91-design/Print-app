import { useState } from "react";
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

const A = "/assets";

type Screen =
  | "login"
  | "register"
  | "otp"
  | "home"
  | "document"
  | "setup"
  | "finishing"
  | "checkout"
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
  copies: number;
  pricePerPage: number;
};

const defaultPrintJob: PrintJob = {
  title: "Assignment",
  fileName: "Class_Document.pdf",
  fileSize: "2.4 MB",
  pages: 12,
  colour: false,
  singleSided: false,
  paper: "A4",
  copies: 1,
  pricePerPage: 2,
};

const quickPrints = [
  { title: "Assignment", detail: "B&W · 2-Sided", icon: "2ace5.svg", preset: defaultPrintJob },
  { title: "Quick Notes", detail: "B&W/Colour · 1/2-Sided", icon: "d2428.svg", preset: { ...defaultPrintJob, title: "Quick Notes", fileName: "Quick_Notes.pdf", fileSize: "4.1 MB", pages: 24, singleSided: true } },
  { title: "Report", detail: "B&W · 1-Sided", icon: "b884a.svg", preset: { ...defaultPrintJob, title: "Report", fileName: "Project_Report.pdf", fileSize: "3.2 MB", pages: 18, singleSided: true } },
  { title: "Project", detail: "Colour · 1-Sided", icon: "99f76.svg", preset: { ...defaultPrintJob, title: "Project", fileName: "Project_Document.pdf", fileSize: "5.6 MB", pages: 10, colour: true, singleSided: true, pricePerPage: 8 } },
  { title: "Resume", detail: "B&W · Single Side", icon: "0ee37.svg", preset: { ...defaultPrintJob, title: "Resume", fileName: "Mehul_Resume.pdf", fileSize: "0.8 MB", pages: 2, singleSided: true } },
  { title: "Presentation", detail: "Colour · 1-Sided", icon: "2c290.svg", preset: { ...defaultPrintJob, title: "Presentation", fileName: "Campus_Presentation.pdf", fileSize: "7.3 MB", pages: 15, colour: true, singleSided: true, pricePerPage: 8 } },
];

function formatPrice(job: PrintJob) {
  return `₹${(job.pages * job.pricePerPage * job.copies).toFixed(2)}`;
}

const notifications = [
  { title: "Print Shop Open", detail: "The campus print shop is now open.", time: "Mon", icon: "fa4b6.svg" },
  { title: "Printing Started", detail: "Your assignment DSP_Lab_Manual_Final.pdf.", time: "5m", icon: "eaf6a.svg" },
  { title: "Payment Successful", detail: "Your assignment DSP_Lab_Manual_Final.pdf.", time: "10m", icon: "4b343.svg" },
  { title: "Print Ready", detail: "Your assignment DSP_Lab_Manual_Final.pdf. is ready for collection.", time: "2m", icon: "4774e.svg" },
];

const orders = [
  { token: "A-26", file: "DSP_Lab_Manual_Final.pdf", meta: "5 pages · 1 copy · A3 · Black & White · Double", price: "₹120.00", status: "Ready", action: "Take Print", icon: "48c44.svg" },
  { token: "A-14", file: "Mehul_Resume_SWE_2026.pdf", meta: "2 pages · 3 copies · A4 (Premium) · Colour · Single", price: "₹48.00", status: "Pending", action: "Print Again", icon: "3f8e5.svg" },
  { token: "C-22", file: "Wedding_Invitation_Design.pdf", meta: "1 page · 10 copies · A5 · Colour · Single", price: "₹250.00", status: "Completed", action: "Print Again", icon: "3f8e5.svg" },
  { token: "D-31", file: "Priya_Marketing_Proposal.pdf", meta: "8 pages · 2 copies · A4 (Premium) · Colour · Double", price: "₹96.00", status: "Completed", action: "Print Again", icon: "3f8e5.svg" },
  { token: "E-15", file: "Campus_Event_Poster.pdf", meta: "1 page · 25 copies · A2 · Colour · Single", price: "₹375.00", status: "Cancelled", action: "Print Again", icon: "0bcda.svg" },
];

function Asset({ name, className = "" }: { name: string; className?: string }) {
  return <img className={className} src={`${A}/${name}`} alt="" />;
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
        <Asset name="0aaa2.png" />
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
            onClick={() => index + 1 <= active && go(step.screen)}
            key={step.label}
          />
        ))}
      </nav>
    </>
  );
}

function Home({
  go,
  onQuickPrint,
}: {
  go: (screen: Screen) => void;
  onQuickPrint: (preset: PrintJob) => void;
}) {
  return (
    <main className="home page">
      <div className="home-top">
        <div>
          <h1>Hey Mehul,</h1>
          <p>Need to print something today?</p>
        </div>
        <button className="notice-link" onClick={() => go("notifications")} aria-label="4 notifications">
          <Asset name="2ab15.svg" /><span>4</span>
        </button>
      </div>

      <section className="hero">
        <div className="hero-orb" />
        <h2>Let’s print something!</h2>
        <p>Upload your document and get it printed quickly.</p>
        <StartPrintingButton onClick={() => onQuickPrint(defaultPrintJob)} />
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

      <TokenCard onClick={() => go("token")} />
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

function DocumentPreview({ close, totalPages }: { close: () => void; totalPages: number }) {
  const [page, setPage] = useState(1);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section className="preview-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Document Preview</h2>
        <PaperPreview page={page} totalPages={totalPages} />
        <div className="page-controls">
          <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Prev Page</button>
          <b>{page} / {totalPages}</b>
          <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next Page →</button>
        </div>
      </section>
    </div>
  );
}

function PaperPreview({ page = 1, totalPages = 12 }: { page?: number; totalPages?: number }) {
  return (
    <div className="paper">
      <div className="paper-title" />
      <i /><i /><i /><i />
      <small>CAMPGRO</small><small>Page {page} of {totalPages}</small>
    </div>
  );
}

function Document({
  go,
  preview,
  job,
  setJob,
}: {
  go: (screen: Screen) => void;
  preview: () => void;
  job: PrintJob;
  setJob: (job: PrintJob) => void;
}) {
  const [page, setPage] = useState(1);
  const samples = [
    defaultPrintJob,
    quickPrints[1].preset,
    quickPrints[2].preset,
  ];
  return (
    <main className="studio page">
      <StepHeader active={1} go={go} close={() => go("home")} />
      <h2>File info</h2>
      <div className="file-card completed-file">
        <Asset name="6e532.svg" />
        <span><b>{job.fileName}</b><small>{job.pages} pages · {job.fileSize} · {job.title}</small></span>
        <label className="file-upload-action" aria-label="Upload another file">
          <Asset name="4dcbe.svg" />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) {
                setJob({
                  ...job,
                  title: "Uploaded Document",
                  fileName: selected.name,
                  fileSize: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
                  pages: 1,
                });
                setPage(1);
              }
            }}
          />
        </label>
      </div>
      <label className="micro-label">Quick Sample Documents</label>
      <div className="samples">
        {samples.map((sample) => (
          <button onClick={() => { setJob({ ...sample }); setPage(1); }} key={sample.title}>
            {sample.title} ({sample.pages}p)
          </button>
        ))}
      </div>
      <h2>Live Document Preview</h2>
      <button className="preview-box" onClick={preview} aria-label="Open document preview"><PaperPreview page={page} totalPages={job.pages} /></button>
      <div className="page-controls">
        <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Prev Page</button>
        <b>{page} / {job.pages}</b>
        <button disabled={page === job.pages} onClick={() => setPage((current) => Math.min(job.pages, current + 1))}>Next Page →</button>
      </div>
      <PriceBar action="Continue To Setup" onClick={() => go("setup")} job={job} />
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

function PriceBar({ action, onClick, job }: { action: string; onClick: () => void; job: PrintJob }) {
  return (
    <div className="price-bar">
      <span>
        <strong>{formatPrice(job)}</strong>
        <small>{job.pages} pages · {job.paper} · {job.colour ? "Colour" : "B&W"}</small>
      </span>
      <ContinueButton label={action} onClick={onClick} />
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
        <SelectionCard active={!job.singleSided} title="Double Sided" detail="Eco-Friendly (Save 50% Paper)" icon="d1b10.svg" activeIcon="0b6b4.svg" onClick={() => setJob({ ...job, singleSided: false })} />
        <SelectionCard active={job.singleSided} title="Single Sided" detail="Clean Document" icon="44881.svg" activeIcon="b9277.svg" onClick={() => setJob({ ...job, singleSided: true })} />
      </div>
      <h2>Paper Size</h2>
      <PaperSizeSelector selected={job.paper} onSelect={(paper) => setJob({ ...job, paper })} />
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
  const [stock, setStock] = useState(0);
  const [speed, setSpeed] = useState("10 min");
  return (
    <main className="studio page">
      <StepHeader active={3} go={go} close={() => go("home")} />
      <h2>Paper Material & Stock</h2>
      <PaperStockGrid selected={stock} onSelect={setStock} />
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
      </div>
      <PriceBar action="Continue" onClick={() => go("checkout")} job={job} />
    </main>
  );
}

function Checkout({
  go,
  preview,
  job,
}: {
  go: (screen: Screen) => void;
  preview: () => void;
  job: PrintJob;
}) {
  const [payment, setPayment] = useState<"UPI" | "Cash">("UPI");
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
          <dt>Paper Specs</dt><dd>{job.paper} · {job.singleSided ? "Single-sided" : "Duplex"}</dd>
          <dt>Binding</dt><dd>No Binding (Free)</dd>
          <dt>Total Payable Amount</dt><dd>{formatPrice(job)}</dd>
        </dl>
      </section>
      <h2>Preview of file</h2>
      <button className="file-card preview-file" onClick={preview}>
        <Asset name="a8609.svg" />
        <span><b>{job.fileName}</b><small>{job.pages} pages · {job.fileSize} · {job.title}</small></span>
        <Asset name="55b40.svg" />
      </button>
      <h2 className="payment-title">Select Payment Method</h2>
      <PaymentSelector selected={payment} onSelect={setPayment} />
      <button className="pay-button" onClick={() => go("token")}>Pay {formatPrice(job)} & Place Order</button>
    </main>
  );
}

function Token({ go, job }: { go: (screen: Screen) => void; job: PrintJob }) {
  return (
    <main className="page token-page">
      <div className="home-top">
        <div><h1>Hey Mehul,</h1><p>Need to print something today?</p></div>
        <button className="notice-link" onClick={() => go("notifications")} aria-label="4 notifications">
          <Asset name="2ab15.svg" /><span>4</span>
        </button>
      </div>
      <div className="receipt-handle" />
      <section className="pickup-card">
        <h2>Your Pickup Token</h2><strong>A-26</strong>
        <p>{job.fileName} · {job.pages} pages ({job.colour ? "Colour" : "B&W"})</p><h3>Order Complete</h3>
      </section>
      <section className="track-card">
        <h2>Order Tracking</h2>
        {[
          ["Queued", "Token assigned in queue", "39cf5.svg"],
          ["Printing", "Your order is printing on Printer 3.", "fc492.svg"],
          ["Ready", "Your order is ready", "057e9.svg"],
          ["Pick up", "Your order is waiting for pickup.", "2851a.svg"],
        ].map(([title, detail, icon]) => (
          <div className="track-step" key={title}>
            <span><Asset name={icon} /></span>
            <div><b>{title}</b><small>{detail}</small></div>
          </div>
        ))}
      </section>
      <div className="token-actions">
        <button onClick={() => go("history")}><Asset name="511b0.svg" />View Print History</button>
        <button className="danger" onClick={() => go("home")}><Asset name="0bcda.svg" />Cancel Print Order</button>
      </div>
    </main>
  );
}

function Notifications({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="page list-page">
      <AppHeader title="Notification" onBack={() => go("home")} />
      <section className="notification-list">
        {notifications.map((item) => (
          <article className="notification-card" key={item.title}>
            <Asset name={item.icon} />
            <span><b>{item.title}</b><small>{item.detail}</small></span>
            <time>{item.time}</time>
          </article>
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

function History({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="page list-page">
      <AppHeader title="History" onBack={() => go("home")} />
      <section className="history-list">
        {orders.map((order) => (
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
        <span><Asset name="8c0b7.svg" /></span>
        <div><h2>Mehul Patel</h2><p>mehul.patel@campus.edu</p><small>Campus Print Member</small></div>
      </section>
      <section className="account-menu" aria-label="Profile options">
        <MenuRow icon="6aaa0.svg" title="Settings" detail="Printing preferences and app settings" onClick={() => go("settings")} />
        <MenuRow icon="2ab15.svg" title="Notifications" detail="Order and print-shop updates" onClick={() => go("notifications")} />
        <MenuRow icon="511b0.svg" title="Print History" detail="Previous and active print orders" onClick={() => go("history")} />
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
  const [showPreview, setShowPreview] = useState(false);
  const [printJob, setPrintJob] = useState<PrintJob>({ ...defaultPrintJob });
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      {screen === "login" && <Login go={go} />}
      {screen === "register" && <Register go={go} />}
      {screen === "otp" && <Otp go={go} />}
      {screen === "home" && (
        <Home
          go={go}
          onQuickPrint={(preset) => {
            setPrintJob({ ...preset });
            go("document");
          }}
        />
      )}
      {screen === "document" && <Document go={go} preview={() => setShowPreview(true)} job={printJob} setJob={setPrintJob} />}
      {screen === "setup" && <Setup go={go} job={printJob} setJob={setPrintJob} />}
      {screen === "finishing" && <Finishing go={go} job={printJob} setJob={setPrintJob} />}
      {screen === "checkout" && <Checkout go={go} preview={() => setShowPreview(true)} job={printJob} />}
      {screen === "token" && <Token go={go} job={printJob} />}
      {screen === "notifications" && <Notifications go={go} />}
      {screen === "history" && <History go={go} />}
      {screen === "profile" && <Profile go={go} />}
      {screen === "settings" && <Settings go={go} />}
      {screen === "help" && <Help go={go} />}
      {showPreview && <DocumentPreview close={() => setShowPreview(false)} totalPages={printJob.pages} />}
    </div>
  );
}
