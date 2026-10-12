import type { ReactNode } from "react";

const A = "/assets";

function Asset({ name }: { name: string }) {
  return <img src={`${A}/${name}`} alt="" />;
}

export function ContinueButton({
  label = "Continue",
  active = false,
  onClick,
}: {
  label?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`continue-component ${active ? "active" : ""}`} onClick={onClick}>
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
      {active && <Asset name="4236e.svg" />}
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
    { id: "history", label: "History", icon: "511b0.svg", action: onHistory },
    { id: "notifications", label: "Notifications", icon: "2ab15.svg", action: onNotifications },
    { id: "profile", label: "Profile", icon: "8c0b7.svg", action: onProfile },
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
  return (
    <button className={`quick-print-component ${active ? "active" : ""}`} onClick={onClick}>
      <Asset name={icon} />
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
  { title: "Regular", detail: "75 GSM Standard", price: "+₹2/page" },
  { title: "Premium", detail: "100 GSM Bright White", price: "+₹5/page" },
  { title: "Glossy", detail: "Glossy Photo Finish", price: "+₹10/page" },
  { title: "Matte", detail: "Elegant non-glare", price: "+₹10/page" },
  { title: "Photo", detail: "250 GSM Ultra Photo", price: "+₹15/page" },
  { title: "Premium", detail: "Certificate Cardstock", price: "+₹8/page" },
];

export function PaperStockGrid({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="paper-stock-component">
      {stocks.map((stock, index) => (
        <button className={selected === index ? "active" : ""} onClick={() => onSelect(index)} key={`${stock.title}-${index}`}>
          <b>{stock.title}</b><strong>{stock.price}</strong><small>{stock.detail}</small>
        </button>
      ))}
    </div>
  );
}

const paperSizes = [
  ["A4", "210 × 297 mm"],
  ["A3", "297 × 420 mm"],
  ["A2", "420 × 594 mm"],
  ["A1", "594 × 841 mm"],
];

export function PaperSizeSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (size: string) => void;
}) {
  return (
    <div className="paper-size-component">
      {paperSizes.map(([size, dimensions]) => (
        <button className={selected === size ? "active" : ""} onClick={() => onSelect(size)} key={size}>
          <b>{size}</b><small>{dimensions}</small>
        </button>
      ))}
    </div>
  );
}

export function TokenCard({
  dark = false,
  onClick,
}: {
  dark?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`token-component ${dark ? "dark" : ""}`} onClick={onClick}>
      <span>Your Token</span>
      <strong>Token A-26</strong>
      <b>Now coming: A-21</b>
      <small>DSP_Lab_Manual_Final.pdf · 18 pages (B&W)</small>
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
