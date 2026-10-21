import type { ReactNode } from "react";

const icons: Record<string, ReactNode> = {
  "057e9.svg": <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  "0b6b4.svg": <><path d="m5 12 4.2 4.2L19 6.5" /></>,
  "0bcda.svg": <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-1.1.9-1.6 1.4-1.6 2.8M12 17h.01" /></>,
  "12960.svg": <path d="m15 18-6-6 6-6" />,
  "29341.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4M9 12h6M9 16h6" /></>,
  "2ab15.svg": <><path d="M3.5 10a8.5 8.5 0 1 1 .7 6.2M3.5 4.5V10H9M12 7v5l3.5 2" /></>,
  "39cf5.svg": <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2M12 2v2M22 12h-2" /></>,
  "3f8e5.svg": <><path d="M4 8a8 8 0 0 1 13.7-2.3L20 8M20 4v4h-4M20 16a8 8 0 0 1-13.7 2.3L4 16m0 4v-4h4" /></>,
  "44881.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4" /></>,
  "4774e.svg": <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  "48c44.svg": <><path d="M6 9V4h12v5M6 17H4V9h16v8h-2M7 14h10v6H7z" /><path d="M17 11h.01" /></>,
  "4b343.svg": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 15h4" /></>,
  "4dcbe.svg": <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></>,
  "64aa8.svg": <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 10h8M8 14h3M12 3v3m0 12v3" /></>,
  "511b0.svg": <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.3 3.1-5.5 7-5.5s6.5 2.2 7 5.5" /></>,
  "678a9.svg": <path d="M14 5 7 12l7 7M7 12h13" />,
  "6aaa0.svg": <><path d="M9.6 3.3 9 5.1a7.2 7.2 0 0 0-1.5.9l-1.8-.7-1.5 2.6 1.4 1.4a7 7 0 0 0 0 1.8l-1.4 1.4 1.5 2.6 1.8-.7a7.2 7.2 0 0 0 1.5.9l.6 1.8h3l.6-1.8a7.2 7.2 0 0 0 1.5-.9l1.8.7 1.5-2.6-1.4-1.4a7 7 0 0 0 0-1.8l1.4-1.4-1.5-2.6-1.8.7a7.2 7.2 0 0 0-1.5-.9l-.6-1.8z" /><circle cx="11.1" cy="11.2" r="2.8" /></>,
  "6e532.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4M9 12h6M9 16h6" /></>,
  "69715.svg": <><path d="M3 10.5 12 3l9 7.5M5.5 9v12h13V9M9.5 21v-7h5v7" /></>,
  logout: <><path d="M11 4H5v16h6M14 8l4-2v12l-4-2zM10 12h10m-3-3 3 3-3 3" /></>,
  "edit-profile": <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" /></>,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></>,
  "835ec.svg": <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M10 5.5h4M10 18.5h4M9 11l2 2 4-4" /></>,
  "8c0b7.svg": <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  "8eec0.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4M9 13h6M12 16v-6m-2 2 2-2 2 2" /></>,
  "986ce.svg": <><path d="M5 5l14 14M19 5 5 19" /></>,
  "a02c4.svg": <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  "ad9cf.svg": <><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  "b3669.svg": <circle cx="12" cy="12" r="9" />,
  "b9277.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4" /></>,
  "bcf58.svg": <><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  "c878a.svg": <><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" /><path d="M14 4v4h4M9 13h6M12 16v-6m-2 2 2-2 2 2" /></>,
  "d1b10.svg": <><path d="M4 7 12 3l8 4-8 4-8-4ZM4 12l8 4 8-4M4 17l8 4 8-4" /></>,
  "d82cc.svg": <path d="m6 6 12 12M18 6 6 18" />,
  "e40ae.svg": <path d="M12 5v14M5 12h14" />,
  "eaf6a.svg": <><path d="M6 9V4h12v5M6 17H4V9h16v8h-2M7 14h10v6H7z" /><path d="M17 11h.01" /></>,
  "f1ae6.svg": <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h4" /><path d="M3 3 21 21" /></>,
  "fa4b6.svg": <><path d="M4 20V8l8-5 8 5v12H4Z" /><path d="M8 20v-7h8v7M8 9h.01M12 9h.01M16 9h.01" /></>,
  "fc492.svg": <><path d="M6 9V4h12v5M6 17H4V9h16v8h-2M7 14h10v6H7z" /><path d="M17 11h.01" /></>,
  "4236e.svg": <path d="m5 12 4.2 4.2L19 6.5" />,
  "pickup.svg": <><path d="M4 13h6l2 3h8a2 2 0 0 1 0 4h-9l-3-3H4z" /><path d="M8 13V5h9v8M11 8h3" /></>,
};

export default function AppIcon({ name, className = "" }: { name: string; className?: string }) {
  const icon = icons[name];
  if (!icon) return <img className={`app-icon ${className}`.trim()} src={`${import.meta.env.BASE_URL}assets/${name}`} alt="" />;

  return (
    <svg className={`app-icon ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icon}
    </svg>
  );
}
