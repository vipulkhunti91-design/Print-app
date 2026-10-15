import type { ReactNode } from "react";

const A = `${import.meta.env.BASE_URL}assets`;

function Asset({ name }: { name: string }) {
  return <img className="app-icon" src={`${A}/${name}`} alt="" />;
}

export function ContinueButton({
  label = "Continue",
  active = false,
  disabled = false,
  onClick,
}: {
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`continue-component ${active ? "active" : ""}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

export function StepPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`step-pill ${active ? "active" : ""}`} onClick={onClick}>
      <span className="step-pill-icon" aria-hidden="true">
        <Asset name="4236e.svg" />
      </span>
      {label}
    </button>
  );
}

export function BottomNavigation({
  active,
  onHome,
  onHistory,
  onNotifications,
  onProfile,
}: {
  active: "home" | "history" | "notifications" | "profile";
  onHome: () => void;
  onHistory: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  const items = [
    { id: "home", label: "Home", icon: "69715.svg", action: onHome },
    { id: "history", label: "History", icon: "2ab15.svg", action: onHistory },
    { id: "notifications", label: "Notifications", icon: "8c0b7.svg", action: onNotifications },
    { id: "profile", label: "Profile", icon: "511b0.svg", action: onProfile },
  ] as const;
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {items.map((item) => (
        <button className={active === item.id ? "active" : ""} onClick={item.action} aria-label={item.label} key={item.id}>
          <Asset name={item.icon} />
        </button>
      ))}
    </nav>
  );
}

export function StartPrintingButton({
  active = false,
  onClick,
}: {
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`start-printing ${active ? "active" : ""}`} onClick={onClick}>
      <Asset name={active ? "c878a.svg" : "8eec0.svg"} />
      Start Printing!
    </button>
  );
}

export function QuickPrintCard({
  title,
  detail,
  icon,
  active = true,
  onClick,
}: {
  title: string;
  detail: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}) {
  const iconPaths: Record<string, ReactNode> = {
    assignment: <><path d="M8 3h8l4 4v14H8z"/><path d="M16 3v5h4M11 12h6M11 16h6"/></>,
    notes: <><path d="M7 4h13v16H7z"/><path d="M4 7v14h13M10 9h7M10 13h7M10 17h5"/></>,
    report: <><path d="M6 3h12l3 3v15H6z"/><path d="M18 3v4h3M9 11h9M9 15h9M9 18h6"/></>,
    project: <><path d="M3 7h8l2 2h8v11H3z"/><path d="M3 10h18"/></>,
    resume: <><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="10" cy="10" r="2"/><path d="M7 16c.8-2 5.2-2 6 0M15 9h2M15 13h2"/></>,
    presentation: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4M8 21h8M8 13l3-3 2 2 4-4"/></>,
  };
  return (
    <button className={`quick-print-component ${active ? "active" : ""}`} onClick={onClick}>
      <svg className="quick-print-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[icon] ?? iconPaths.assignment}</svg>
      <span><b>{title}</b><small>{detail}</small></span>
    </button>
  );
}

export function PrintOptionCard({
  title,
  price,
  detail,
  active,
  icon,
  activeIcon,
  onClick,
}: {
  title: string;
  price: string;
  detail: string;
  active: boolean;
  icon: string;
  activeIcon?: string;
  onClick: () => void;
}) {
  return (
    <button className={`print-option-component ${active ? "active" : ""}`} onClick={onClick}>
      <Asset name={active && activeIcon ? activeIcon : icon} />
      <b>{title}</b>
      <strong>{price}</strong>
      <small>{detail}</small>
    </button>
  );
}

export function SelectionCard({
  title,
  detail,
  active,
  icon,
  activeIcon,
  onClick,
}: {
  title: string;
  detail: string;
  active: boolean;
  icon: string;
  activeIcon?: string;
  onClick: () => void;
}) {
  return (
    <button className={`selection-component ${active ? "active" : ""}`} onClick={onClick}>
      <span>
        <Asset name={active && activeIcon ? activeIcon : icon} />
        <b>{title}</b>
      </span>
      <small>{detail}</small>
    </button>
  );
}

const stocks = [
  { title: "Regular", detail: "75 GSM Standard", price: "+₹2/page", surcharge: 2 },
  { title: "Premium", detail: "100 GSM Bright White", price: "+₹5/page", surcharge: 5 },
  { title: "Glossy", detail: "Glossy Photo Finish", price: "+₹10/page", surcharge: 10 },
  { title: "Matte", detail: "Elegant non-glare", price: "+₹10/page", surcharge: 10 },
  { title: "Photo", detail: "250 GSM Ultra Photo", price: "+₹15/page", surcharge: 15 },
  { title: "Premium", detail: "Certificate Cardstock", price: "+₹8/page", surcharge: 8 },
];

export function PaperStockGrid({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number, surcharge: number) => void;
}) {
  return (
    <div className="paper-stock-component">
      {stocks.map((stock, index) => (
        <button className={selected === index ? "active" : ""} onClick={() => onSelect(index, stock.surcharge)} key={`${stock.title}-${index}`}>
          <b>{stock.title}</b><strong>{stock.price}</strong><small>{stock.detail}</small>
        </button>
      ))}
    </div>
  );
}

const paperSizes = [
  { size: "A4", dimensions: "210 × 297 mm", surcharge: 0 },
  { size: "A3", dimensions: "297 × 420 mm", surcharge: 1 },
  { size: "A2", dimensions: "420 × 594 mm", surcharge: 2 },
  { size: "A1", dimensions: "594 × 841 mm", surcharge: 3 },
];

export function PaperSizeSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (size: string, surcharge: number) => void;
}) {
  return (
    <div className="paper-size-component">
      {paperSizes.map(({ size, dimensions, surcharge }) => (
        <button className={selected === size ? "active" : ""} onClick={() => onSelect(size, surcharge)} key={size}>
          <b>{size}</b><small>{dimensions}</small><em>{surcharge ? `+₹${surcharge}/page` : "Base price"}</em>
        </button>
      ))}
    </div>
  );
}

export function TokenCard({
  dark = false,
  onClick,
  token = "A-26",
  fileName = "",
  pages = 0,
  colour = false,
  status = "In queue",
}: {
  dark?: boolean;
  onClick?: () => void;
  token?: string;
  fileName?: string;
  pages?: number;
  colour?: boolean;
  status?: string;
}) {
  return (
    <button className={`token-component ${dark ? "dark" : ""}`} onClick={onClick} aria-label={`View pickup token ${token}`}>
      <span>Your Token</span>
      <strong>Token {token}</strong>
      <b>{status}</b>
      <small>{fileName} · {pages} pages ({colour ? "Colour" : "B&W"})</small>
    </button>
  );
}

export function Radio({ active }: { active: boolean }) {
  return <span className="radio-component"><Asset name={active ? "a02c4.svg" : "b3669.svg"} /></span>;
}

export function PaymentSelector({
  selected,
  onSelect,
}: {
  selected: "UPI" | "Cash";
  onSelect: (payment: "UPI" | "Cash") => void;
}) {
  const methods: Array<{ id: "UPI" | "Cash"; title: string; detail: ReactNode; icon: string }> = [
    { id: "UPI", title: "UPI", detail: <>UPI Instant Pay (GPay, PhonePe,<br />Paytm, scan at counter)</>, icon: "835ec.svg" },
    { id: "Cash", title: "Cash on Counter", detail: <>Cash on collection (Pay at pickup<br />counter)</>, icon: "64aa8.svg" },
  ];
  return (
    <div className="payment-component">
      {methods.map((method) => (
        <button onClick={() => onSelect(method.id)} key={method.id}>
          <Asset name={method.icon} />
          <span><b>{method.title}</b><small>{method.detail}</small></span>
          <Radio active={selected === method.id} />
        </button>
      ))}
    </div>
  );
}

export type UploadedFile = {
  id: string;
  name: string;
  size: string;
  progress: number;
  timeLeft: string;
  kind?: "document" | "video";
};

export function UploadedFiles({
  files,
  onRemove,
  onAdd,
}: {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <section className="uploaded-files-component">
      <div className="uploaded-files-heading">
        <h2>Uploaded Files</h2>
        {onAdd && <button onClick={onAdd} aria-label="Add file"><Asset name="e40ae.svg" /></button>}
      </div>
      {files.map((file) => (
        <article key={file.id}>
          <span className={`upload-kind ${file.kind === "video" ? "video" : ""}`} aria-hidden="true" />
          <div>
            <b>{file.name}</b>
            <p>{file.size} | {file.progress}% · {file.timeLeft}</p>
          </div>
          <button onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`}><Asset name="986ce.svg" /></button>
          <progress max="100" value={file.progress}>{file.progress}%</progress>
        </article>
      ))}
    </section>
  );
}
