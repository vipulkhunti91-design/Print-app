import { printQueueManager, type QueueOrder } from "./services/printQueueService";
import {
  type SupportedLanguage,
  getStoredLanguage,
  saveStoredLanguage,
  getTranslation,
} from "./utils/i18n";
import { HomeShortcuts } from "./components/HomeShortcuts";
import { LegibilityChecker } from "./components/LegibilityChecker";
import { DeadlineCheckCard } from "./components/DeadlineCheckCard";
import { TokenQRDisplay } from "./components/TokenQRDisplay";
import { MaterialSubstitutionModal, type MaterialSubstitutionAlert } from "./components/MaterialSubstitutionModal";
import { GroupCostSettlement } from "./components/GroupCostSettlement";
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import {
  BottomNavigation,
  ContinueButton,
  PaperStockGrid,
  PaymentSelector,
  QuickPrintCard,
  StartPrintingButton,
  StepPill,
  TokenCard,
} from "./components/PrintComponents";
import AppIcon from "./components/AppIcon";
import LoginSheet, { type LoginSummary } from "./components/LoginSheet";
import { formatTimeRemaining, getShopStatus, type ShopStatus } from "./config/shopHours";
import { demoActiveOrder, demoOldDocuments, demoProfile } from "./data/demoData";
import { calculateEstimatedReadyTime } from "./utils/estimatedTime";
import {
  UploadHeroIllustration,
  EmptyHistoryIllustration,
  PaymentCelebrationIllustration,
  TrackingStatusIllustration,
  NoActiveOrderIllustration,
} from "./components/AppIllustrations";
import {
  NotificationsScreen,
  type PrintOrderNotification,
} from "./components/NotificationsScreen";
import AuthModal, {
  authSessionStorageKey,
  readStoredAuthSession,
  saveAuthSession,
  clearAuthSession,
  type AuthUser,
} from "./components/AuthModal";
import PaymentProcessingModal, {
  type PaymentProcessStatus,
} from "./components/PaymentProcessingModal";
import PaymentPage from "./components/PaymentPage";
import AdminMasterControl from "./components/AdminMasterControl";
import { securityEngine, type FirebaseOrderRecord } from "./services/securityEngine";
import OnboardingFlow from "./components/OnboardingFlow";

const A = `${import.meta.env.BASE_URL}assets`;

type Screen =
  | "login"
  | "register"
  | "otp"
  | "home"
  | "setup"
  | "finishing"
  | "checkout"
  | "payment"
  | "paymentSuccess"
  | "token"
  | "notifications"
  | "history"
  | "profile"
  | "editProfile"
  | "settings"
  | "admin"
  | "help";

type NavTab = "home" | "notifications" | "history" | "settings";
const MAIN_TABS: readonly NavTab[] = ["home", "notifications", "history", "settings"] as const;

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
  pageRange?: string;
  pageRangeMode?: "all" | "current" | "custom";
  pagesPerSheet?: number;
  orientation?: "Portrait" | "Landscape";
  printQuality?: "Draft" | "Standard" | "High";
  bindingOption?: "none" | "staple-left" | "staple-right" | "spiral";
  bindingSurcharge?: number;
  marginSize?: "normal" | "narrow" | "none";
  specialInstructions?: string;
  noteToShop?: string;
  readyMinutes?: number;
  paperStock?: string;
};

type ActiveOrder = {
  recordId: string;
  token: string;
  job: PrintJob;
  status: "confirmed" | "queued" | "printing" | "ready" | "pickup" | "completed" | "cancelled";
  createdAt?: number;
};


type ProfileDetails = { name: string; phone: string; email: string; photo: string };
type PrintHistoryRecord = {
  id: string;
  token: string;
  job: PrintJob;
  submittedAt: string;
  status: ActiveOrder["status"];
  isDemo?: boolean;
  createdAt?: number;
};

const profileStorageKey = "phopy-profile";
const printHistoryStorageKey = "phopy-print-history";
const activeOrderStorageKey = "phopy-active-order";
const demoDataDisabledKey = "phopy-demo-data-disabled";
const emptyProfile: ProfileDetails = { name: "", phone: "", email: "", photo: demoProfile.photo };
const rememberedPayUserKey = "printq-remembered-pay-user";

type RememberedPayUser = { name: string; mobile: string };

function readRememberedPayUser(): RememberedPayUser | null {
  try {
    const saved = window.localStorage.getItem(rememberedPayUserKey);
    if (!saved) return null;
    const value = JSON.parse(saved) as Partial<RememberedPayUser>;
    return typeof value.name === "string" && typeof value.mobile === "string"
      ? { name: value.name, mobile: value.mobile }
      : null;
  } catch {
    return null;
  }
}

function isDemoDataDisabled() {
  try { return window.localStorage.getItem(demoDataDisabledKey) === "true"; } catch { return false; }
}

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function createRecordId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function generateUniquePickupToken(existingTokens: string[] = []): string {
  const letters = ["K", "M", "P", "R", "T", "B", "D", "G", "H", "J", "L", "N", "S", "W", "A"];
  const existingSet = new Set(existingTokens.map((t) => t.toUpperCase()));
  for (let attempts = 0; attempts < 100; attempts++) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    const candidate = `${letter}-${num}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }
  return `P-${Math.floor(Math.random() * 900) + 100}`;
}


async function clearClientSideData() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
  }
  const indexedDb = window.indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
  const databases = await indexedDb.databases?.() ?? [];
  await Promise.all(databases.flatMap(({ name }) => name ? [new Promise<void>((resolve, reject) => {
    const request = indexedDb.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not delete local database."));
    request.onblocked = () => reject(new Error("A local database is still in use."));
  })] : []));
}

const orderStatusLabels: Record<ActiveOrder["status"], string> = {
  confirmed: "Order Confirmed",
  queued: "Queued",
  printing: "Printing",
  ready: "Ready for Pickup",
  pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

type FilePreviewData = {
  url: string;
  type: string;
  name: string;
  size: string;
  pages?: number;
  pagesEstimated?: boolean;
} | null;

type UploadedFileData = NonNullable<FilePreviewData>;

type SavedPrintSettings = {
  colour: boolean;
  singleSided: boolean;
  paper: string;
  copies: number;
  pageRange: string;
  pageRangeMode: "all" | "current" | "custom";
  pagesPerSheet: number;
  orientation: "Portrait" | "Landscape";
  printQuality?: "Draft" | "Standard" | "High";
  bindingOption?: "none" | "staple-left" | "staple-right" | "spiral";
  marginSize?: "normal" | "narrow" | "none";
  noteToShop: string;
  paperStock?: string;
};

const printSettingsStorageKey = "printq-last-print-settings";
export const userCustomPresetKey = "printq-user-custom-preset";

export const BINDING_CONFIG = [
  { id: "none", title: "No Binding", detail: "Loose printed sheets, neatly sorted", priceTag: "+₹0.00", surcharge: 0 },
  { id: "staple-left", title: "Staple: Top Left", detail: "Heavy-duty staple in top-left corner", priceTag: "+₹2.00 / set", surcharge: 2 },
  { id: "staple-right", title: "Staple: Top Right", detail: "Corner staple in top-right corner", priceTag: "+₹2.00 / set", surcharge: 2 },
  { id: "spiral", title: "Spiral Binding", detail: "Front transparent & back black card", priceTag: "+₹25.00 / set", surcharge: 25 },
] as const;

export const PRINT_QUALITY_CONFIG = [
  { id: "Draft", title: "Draft", detail: "Faster printing, lower toner usage", speedBadge: "⚡ Fast Speed", indicator: "fast" },
  { id: "Standard", title: "Standard", detail: "Balanced speed & crisp print quality", speedBadge: "⏱ Normal Speed", indicator: "normal" },
  { id: "High", title: "High", detail: "Higher-resolution output for fine details", speedBadge: "✨ High Detail", indicator: "quality" },
] as const;

export const MARGIN_CONFIG = [
  { id: "normal", title: "Normal Margins", detail: "Standard 0.75\" printable margins", thumbClass: "normal" },
  { id: "narrow", title: "Narrow Margins", detail: "Reduced 0.3\" margins for more room", thumbClass: "narrow" },
  { id: "none", title: "No Margins", detail: "Edge-to-edge full bleed (where supported)", thumbClass: "none" },
] as const;

export const PAPER_PRICES: Record<
  string,
  Record<string, { single: number; double: number | null }>
> = {
  "Regular Paper": {
    "A4": { single: 2,   double: 3   },
    "A3": { single: 5,   double: 8   },
    "A2": { single: 15,  double: 25  },
    "A1": { single: 25,  double: 40  }
  },
  "Premium Paper": {
    "A4": { single: 3,   double: 5   },
    "A3": { single: 8,   double: 12  },
    "A2": { single: 20,  double: 35  },
    "A1": { single: 35,  double: 60  }
  },
  "Matte Paper": {
    "A4": { single: 8,   double: 12  },
    "A3": { single: 15,  double: 25  },
    "A2": { single: 30,  double: 50  },
    "A1": { single: 50,  double: 80  }
  },
  "Glossy Photo": {
    "A4": { single: 15,  double: null },
    "A3": { single: 30,  double: null },
    "A2": { single: 60,  double: null },
    "A1": { single: 100, double: null }
  },
  "Premium Photo": {
    "A4": { single: 20,  double: null },
    "A3": { single: 40,  double: null },
    "A2": { single: 80,  double: null },
    "A1": { single: 130, double: null }
  },
  "Certificate Paper": {
    "A4": { single: 8,   double: 12  },
    "A3": { single: 15,  double: 25  },
    "A2": { single: 30,  double: 50  },
    "A1": { single: 50,  double: 80  }
  },
  "Cardstock": {
    "A4": { single: 15,  double: null },
    "A3": { single: 30,  double: null },
    "A2": { single: 60,  double: null },
    "A1": { single: 100, double: null }
  }
};

export const PAPER_STOCK_CONFIG = [
  {
    name: "Regular Paper",
    gsm: "70–75 GSM",
    detail: "70–75 GSM Standard · Everyday documents & xerox",
    doubleAllowed: true,
  },
  {
    name: "Premium Paper",
    gsm: "80–100 GSM",
    detail: "80–100 GSM Bond · Crisp & bright white for resumes",
    doubleAllowed: true,
  },
  {
    name: "Matte Paper",
    gsm: "120–170 GSM",
    detail: "120–170 GSM Matte · Smooth non-glare for portfolios",
    doubleAllowed: true,
  },
  {
    name: "Glossy Photo",
    gsm: "180–260 GSM",
    detail: "180–260 GSM Glossy · High-shine photo surface for flyers",
    doubleAllowed: false,
  },
  {
    name: "Premium Photo",
    gsm: "200–260 GSM",
    detail: "200–260 GSM Ultra Photo · Studio-quality vibrant photo paper",
    doubleAllowed: false,
  },
  {
    name: "Certificate Paper",
    gsm: "100–170 GSM",
    detail: "100–170 GSM Parchment · Elegant heavy card for awards & certificates",
    doubleAllowed: true,
  },
  {
    name: "Cardstock",
    gsm: "200–300 GSM",
    detail: "200–300 GSM Heavy Card · Heavy card for posters & covers",
    doubleAllowed: false,
  },
] as const;

export const PAPER_SIZE_CONFIG = [
  { size: "A4", dim: "210 × 297 mm", isLargeFormat: false },
  { size: "A3", dim: "297 × 420 mm", isLargeFormat: false },
  { size: "A2", dim: "420 × 594 mm", isLargeFormat: true, note: "Requires large-format printer" },
  { size: "A1", dim: "594 × 841 mm", isLargeFormat: true, note: "Requires large-format printer" },
] as const;

export function normalizePaperStock(name?: string): string {
  if (!name) return "Regular Paper";
  if (name === "Regular") return "Regular Paper";
  if (name === "Premium") return "Premium Paper";
  if (name === "Matte") return "Matte Paper";
  if (name === "Glossy") return "Glossy Photo";
  if (name === "Photo Premium" || name === "Photo") return "Premium Photo";
  if (name === "Certificate Cardstock") return "Certificate Paper";
  return name;
}

export function isDoubleSidedAvailable(paperStock?: string): boolean {
  const stock = normalizePaperStock(paperStock);
  const a4Entry = PAPER_PRICES[stock]?.["A4"];
  return a4Entry?.double !== null && a4Entry?.double !== undefined;
}

export function getPricePerSheet(paperStock: string, paperSize: string, singleSided: boolean, colour = false): number {
  const stock = normalizePaperStock(paperStock);
  const stockEntry = PAPER_PRICES[stock] ?? PAPER_PRICES["Regular Paper"];
  const sizeEntry = stockEntry[paperSize] ?? stockEntry["A4"];
  const baseRate = (singleSided || sizeEntry.double === null) ? sizeEntry.single : sizeEntry.double;
  if (!colour) {
    return baseRate;
  }
  // Print Option: Full Colour rate adds +₹6.00 per side
  const colourAddon = singleSided ? 6 : 11;
  return baseRate + colourAddon;
}

export function calculateJobPricing(job: PrintJob, uploadedFilesCount = 1) {
  const stock = normalizePaperStock(job.paperStock);
  const size = job.paper || "A4";
  const isSingle = job.singleSided || !isDoubleSidedAvailable(stock);
  const isColour = Boolean(job.colour);

  const unitRate = getPricePerSheet(stock, size, isSingle, isColour);
  const optionCost = isColour ? 8 : 2;
  const sideCost = isSingle ? getPricePerSheet(stock, size, true, isColour) : getPricePerSheet(stock, size, false, isColour);

  const rawPages = Math.max(1, job.pages || 1);
  const pagesPerSheet = Math.max(1, job.pagesPerSheet || 1);
  const printableSides = Math.ceil(rawPages / pagesPerSheet);
  const sheetsPerFile = isSingle ? printableSides : Math.ceil(printableSides / 2);

  const copies = Math.max(1, job.copies || 1);
  const fileMultiplier = Math.max(1, uploadedFilesCount);
  const totalSheets = sheetsPerFile * copies * fileMultiplier;

  const printSubtotal = unitRate * totalSheets;
  const bindingSubtotal = (job.bindingSurcharge || 0) * copies;
  const grandTotal = printSubtotal + bindingSubtotal;

  return {
    stock,
    size,
    isSingle,
    isColour,
    optionLabel: isColour ? "Full Colour" : "Black & White",
    optionRate: optionCost,
    sideLabel: isSingle ? "Single-Sided" : "Double-Sided",
    sideRate: sideCost,
    unitRate,
    sheetsPerFile,
    totalSheets,
    copies,
    fileMultiplier,
    printSubtotal,
    bindingSubtotal,
    grandTotal,
    formulaSummary: `${isColour ? "Full Colour" : "B&W"} · ${isSingle ? "Single-sided" : "Double-sided"} · ${size} · ${stock}`,
    formulaDetail: `₹${unitRate.toFixed(2)} per sheet × ${totalSheets} ${totalSheets === 1 ? "sheet" : "sheets"} = ₹${printSubtotal.toFixed(2)}`,
  };
}

export const QUICK_PRESETS_CONFIG = [
  {
    id: "assignment",
    name: "Assignment",
    desc: "A4 · B&W · 2-Sided · Standard quality · Normal margins",
    tag: "Popular",
    settings: {
      paper: "A4",
      colour: false,
      singleSided: false,
      printQuality: "Standard" as const,
      marginSize: "normal" as const,
      pagesPerSheet: 1,
      paperStock: "Regular Paper",
    },
  },
  {
    id: "resume",
    name: "Resume",
    desc: "A4 · 1-Sided · Standard quality · Crisp normal margins",
    tag: "Career",
    settings: {
      paper: "A4",
      singleSided: true,
      printQuality: "Standard" as const,
      marginSize: "normal" as const,
      pagesPerSheet: 1,
      paperStock: "Premium Paper",
    },
  },
  {
    id: "photo",
    name: "Photo",
    desc: "Glossy/Photo paper · Full Colour · High quality · 1-Sided",
    tag: "Studio",
    settings: {
      paper: "A4",
      colour: true,
      singleSided: true,
      printQuality: "High" as const,
      marginSize: "none" as const,
      pagesPerSheet: 1,
      paperStock: "Glossy Photo",
    },
  },
] as const;

export const PICKUP_TIME_CONFIG = [
  { time: "10 Minutes", desc: "Ready in approximately 10 minutes", minutes: 10, badge: "Express" },
  { time: "30 Minutes", desc: "Ready in approximately 30 minutes", minutes: 30, badge: "Standard" },
  { time: "1 Hour", desc: "Ready in approximately 1 hour", minutes: 60, badge: "Flexible" },
  { time: "2 Hours", desc: "Ready in approximately 2 hours", minutes: 120, badge: "Later today" },
] as const;

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
  pageRange: "",
  pageRangeMode: "all",
  pagesPerSheet: 1,
  orientation: "Portrait",
  printQuality: "Standard",
  bindingOption: "none",
  bindingSurcharge: 0,
  marginSize: "normal",
  specialInstructions: "",
  noteToShop: "",
  readyMinutes: 10,
  paperStock: "Regular Paper",
};

const quickPrints = [
  { title: "Assignment", detail: "B&W · 2-sided", icon: "assignment", preset: defaultPrintJob },
  { title: "Quick Notes", detail: "B&W or colour · 1 or 2 sided", icon: "notes", preset: { ...defaultPrintJob, title: "Quick Notes", fileName: "Quick_Notes.pdf", fileSize: "4.1 MB", pages: 24, singleSided: true } },
  { title: "Report", detail: "B&W · 1-sided", icon: "report", preset: { ...defaultPrintJob, title: "Report", fileName: "Project_Report.pdf", fileSize: "3.2 MB", pages: 18, singleSided: true } },
  { title: "Project", detail: "Colour · 1-sided", icon: "project", preset: { ...defaultPrintJob, title: "Project", fileName: "Project_Document.pdf", fileSize: "5.6 MB", pages: 10, colour: true, singleSided: true } },
  { title: "Resume", detail: "B&W · single-sided", icon: "resume", preset: { ...defaultPrintJob, title: "Resume", fileName: "Mehul_Resume.pdf", fileSize: "0.8 MB", pages: 2, singleSided: true } },
  { title: "Presentation", detail: "Colour · 1-sided", icon: "presentation", preset: { ...defaultPrintJob, title: "Presentation", fileName: "Campus_Presentation.pdf", fileSize: "7.3 MB", pages: 15, colour: true, singleSided: true } },
];

function formatPrice(job: PrintJob) {
  const pricing = calculateJobPricing(job, 1);
  return `₹${pricing.grandTotal.toFixed(2)}`;
}

function getSelectedPageCount(job: PrintJob) {
  const allPages = Math.max(0, Number(job.pages) || 0);
  const range = job.pageRange?.trim();
  if (!range || range.toLowerCase() === "all") return allPages;
  const selected = new Set<number>();
  for (const token of range.split(",")) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return allPages;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start) return allPages;
    for (let page = start; page <= end; page += 1) selected.add(page);
  }
  return selected.size || allPages;
}

function parsePageRangeInput(value: string, totalPages: number): { valid: boolean; pages: number[]; error?: string } {
  const normalized = value.trim();
  if (!normalized) return { valid: false, pages: [], error: "Enter page numbers like: 1-5, 8, 11-13" };
  const tokens = normalized.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { valid: false, pages: [], error: "Enter valid page numbers or comma-separated ranges." };
  
  const pagesSet = new Set<number>();
  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = token.match(/^(\d+)$/);
    if (!rangeMatch && !singleMatch) {
      return { valid: false, pages: [], error: `Invalid format near "${token}". Use formats like "1-5" or "8".` };
    }
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1) {
        return { valid: false, pages: [], error: `Page numbers must start at 1 or greater.` };
      }
      if (start > end) {
        return { valid: false, pages: [], error: `Reversed page range "${token}" is invalid. Start must be less than end (e.g. "${end}-${start}").` };
      }
      if (end > totalPages) {
        return { valid: false, pages: [], error: `Page ${end} exceeds total document page count of ${totalPages}.` };
      }
      for (let p = start; p <= end; p++) {
        pagesSet.add(p);
      }
    } else if (singleMatch) {
      const pageNum = Number(singleMatch[1]);
      if (pageNum < 1) {
        return { valid: false, pages: [], error: `Page numbers must start at 1 or greater.` };
      }
      if (pageNum > totalPages) {
        return { valid: false, pages: [], error: `Page ${pageNum} exceeds total document page count of ${totalPages}.` };
      }
      pagesSet.add(pageNum);
    }
  }

  const sortedPages = Array.from(pagesSet).sort((a, b) => a - b);
  if (sortedPages.length === 0) {
    return { valid: false, pages: [], error: "No valid pages selected." };
  }
  return { valid: true, pages: sortedPages };
}

function validatePageRange(value: string, totalPages: number) {
  return parsePageRangeInput(value, totalPages).valid;
}

function isImageFile(fileName?: string, fileType?: string): boolean {
  if (fileType && fileType.startsWith("image/")) return true;
  if (fileName && /\.(jpe?g|png|webp|gif|svg|bmp|tiff|heic)$/i.test(fileName)) return true;
  return false;
}

function countPdfPages(buffer: ArrayBuffer) {
  const text = new TextDecoder("latin1").decode(buffer);
  return (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

function estimatedPageCount(fileSize: number, fileName?: string, fileType?: string) {
  if (isImageFile(fileName, fileType)) {
    return 1;
  }
  return Math.max(1, Math.round((fileSize / 1024) / 50));
}

type AppNotification = PrintOrderNotification;

const notificationStorageKey = "printq-notifications-v2";

const defaultNotifications: PrintOrderNotification[] = [
  {
    id: "notif-demo-queued-A-26",
    type: "queued",
    title: "Order Queued",
    message: "Your order #A-26 (Assignment_Maths.pdf) has been added to the printing queue at Campus Central.",
    timestamp: Date.now() - 4 * 60 * 1000,
    orderToken: "A-26",
    recordId: "demo-active-A-26",
    read: false,
    iconType: "queue",
  },
  {
    id: "notif-demo-placed-A-26",
    type: "order_placed",
    title: "Order Placed & Payment Confirmed",
    message: "Your print order for Assignment_Maths.pdf was placed with Pickup Token A-26.",
    timestamp: Date.now() - 10 * 60 * 1000,
    orderToken: "A-26",
    recordId: "demo-active-A-26",
    read: false,
    iconType: "payment",
  },
  {
    id: "notif-demo-ready-A-22",
    type: "ready",
    title: "Ready for Pickup",
    message: "Your order #A-22 (Project_Report.pdf) is ready for pickup at Shelf A-2.",
    timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
    orderToken: "A-22",
    recordId: "demo-old-2",
    read: true,
    iconType: "ready",
  },
  {
    id: "notif-demo-collected-A-25",
    type: "completed",
    title: "Order Collected",
    message: "Your order #A-25 (Assignment_Maths.pdf) was marked as collected. Thank you!",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    orderToken: "A-25",
    recordId: "demo-old-1",
    read: true,
    iconType: "completed",
  },
  {
    id: "notif-demo-cancelled-A-16",
    type: "cancelled",
    title: "Order Cancelled",
    message: "Your print order for Notes_Physics.pdf (Token A-16) was cancelled.",
    timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000,
    orderToken: "A-16",
    recordId: "demo-old-4",
    read: true,
    iconType: "cancelled",
  },
];

function readNotifications(): PrintOrderNotification[] {
  try {
    const saved = window.localStorage.getItem(notificationStorageKey);
    if (!saved) return isDemoDataDisabled() ? [] : defaultNotifications;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as PrintOrderNotification[]) : isDemoDataDisabled() ? [] : defaultNotifications;
  } catch {
    return isDemoDataDisabled() ? [] : defaultNotifications;
  }
}

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
          <path fill="var(--cool-support)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
          <path fill="var(--status-ready)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="var(--text-secondary)" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84Z" />
          <path fill="var(--error)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [otpError, setOtpError] = useState("");
  const timerRef = useRef<number | null>(null);

  const triggerVerify = (codeArr: string[]) => {
    const code = codeArr.join("");
    if (code.length !== 4 || isVerifying) return;
    if (!/^\d{4}$/.test(code)) {
      setOtpError("Please enter 4 valid numbers.");
      return;
    }
    setIsVerifying(true);
    setOtpError("");

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      timerRef.current = window.setTimeout(() => {
        go("home");
      }, 350);
    }, 450);
  };

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = digits.map((item, itemIndex) => itemIndex === index ? digit : item);
    setDigits(updated);
    setOtpError("");
    if (digit && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    if (updated.join("").length === 4) {
      triggerVerify(updated);
    }
  };

  return (
    <main className="auth-page otp-page">
      <AuthLogo />
      <form
        className="auth-panel otp-panel"
        onSubmit={(event) => {
          event.preventDefault();
          triggerVerify(digits);
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
        {otpError && <p className="login-sheet-error" role="alert" style={{ textAlign: "center", marginTop: "8px" }}>{otpError}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "24px", margin: "8px 0", fontSize: "13px", color: isSuccess ? "var(--success, #A7E8BD)" : "var(--text-muted, #A3A3A3)" }}>
          {isVerifying && <span>Verifying OTP…</span>}
          {isSuccess && <span>✓ OTP Verified! Navigating…</span>}
          {!isVerifying && !isSuccess && <span>Auto-verifies upon entering 4 digits</span>}
        </div>
        <button className="auth-primary" type="submit" disabled={digits.join("").length !== 4 || isVerifying}>
          {isVerifying ? "Verifying…" : isSuccess ? "Verified!" : "Continue"}
        </button>
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
  canAdvance = true,
}: {
  active: 1 | 2 | 3 | 4;
  go: (screen: Screen) => void;
  close: () => void;
  canAdvance?: boolean;
}) {
  const steps: { label: string; screen: Screen }[] = [
    { label: "Home", screen: "home" },
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
            disabled={index + 1 > active && !canAdvance}
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
  statusMessage,
}: {
  go: (screen: Screen) => void;
  onStartPrinting: () => void;
  onQuickPrint: (preset: PrintJob) => void;
  order: ActiveOrder | null;
  onCancelOrder: () => boolean;
  statusMessage: string;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [showTokenScrollHint, setShowTokenScrollHint] = useState(false);
  const homeRef = useRef<HTMLElement | null>(null);
  const homeTokenRef = useRef<HTMLElement | null>(null);
  const canCancel = order?.status === "queued";
  const orderEstimate = order ? calculateEstimatedReadyTime({
    pages: order.job.pages,
    copies: order.job.copies,
    colour: order.job.colour,
    singleSided: order.job.singleSided,
    paper: order.job.paper,
    paperStock: order.job.paperStock,
  }) : null;
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
      {statusMessage && <p className="data-deleted-message" role="status" aria-live="polite">{statusMessage}</p>}
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
        <div className="home-queue-badge" aria-label="Current queue status">
          <span className="home-queue-pulse" aria-hidden="true" />
          <span>Shop queue: ~15 mins turnaround · 5 orders ahead (approx.)</span>
        </div>
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
            estimatedReady={order.status === "ready" || order.status === "pickup" ? "Ready for pickup now at Shelf A-2" : order.status === "cancelled" ? "Order cancelled" : `Estimated ready in ~${orderEstimate?.minutes} mins · Around ${orderEstimate?.readyTimeFormatted}`}
          />
          <div className="home-order-eta-banner" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="home-order-eta-text">
              <strong>{order.status === "ready" || order.status === "pickup" ? "Ready for pickup at Shelf A-2" : `Estimated ready around ${orderEstimate?.readyTimeFormatted}`}</strong>
              <small>{order.status === "ready" || order.status === "pickup" ? "Please show token at pickup counter." : `~${orderEstimate?.minutes} mins turnaround · 5 orders ahead in queue (approx. estimate)`}</small>
            </div>
          </div>
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
  orientation = "Portrait",
  pagesPerSheet = 1,
  marginSize = "normal",
  onReady,
  onError,
}: {
  previewData: FilePreviewData;
  page: number;
  totalPages: number;
  colour: boolean;
  fileName: string;
  applyChanges?: boolean;
  orientation?: "Portrait" | "Landscape";
  pagesPerSheet?: number;
  marginSize?: "normal" | "narrow" | "none";
  onReady?: () => void;
  onError?: () => void;
}) {
  const [loadError, setLoadError] = useState(false);
  const isLandscape = orientation === "Landscape";
  const previewClass = `${applyChanges && !colour ? " black-and-white-preview" : ""}${isLandscape ? " is-landscape" : " is-portrait"}`;
  const isImage = previewData?.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewData?.name ?? "");
  const isPdf = previewData?.type === "application/pdf" || /\.pdf$/i.test(previewData?.name ?? "");

  // Reset error state when file changes
  useEffect(() => {
    setLoadError(false);
  }, [previewData?.url, previewData?.name]);

  useEffect(() => {
    if (!previewData || isImage || isPdf) return;
    onReady?.();
  }, [previewData, isImage, isPdf, onReady]);

  const handleImageError = () => {
    setLoadError(true);
    onError?.();
  };

  const activeName = previewData?.name ?? fileName ?? "Document";
  const ext = (activeName.split(".").pop() || "").toUpperCase();
  const fileTypeLabel = /PDF/i.test(ext) ? "PDF" : /(DOC|DOCX|TXT|PPT|PPTX)/i.test(ext) ? "DOC" : /(JPG|JPEG|PNG|WEBP|SVG)/i.test(ext) ? "IMG" : "DOC";

  const renderPlaceholder = () => (
    <div
      className={`preview-placeholder-box ${isLandscape ? "is-landscape" : "is-portrait"}`}
      role="img"
      aria-label={`Preview not available for ${activeName}`}
    >
      <div className="preview-placeholder-icon-wrap">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <span className="preview-placeholder-badge">{fileTypeLabel}</span>
      </div>
      <strong className="preview-placeholder-name" title={activeName}>{activeName}</strong>
      <span className="preview-placeholder-sub">Preview not available</span>
    </div>
  );

  if (loadError) {
    return renderPlaceholder();
  }

  if (previewData && isImage) {
    return (
      <div className={`uploaded-preview-frame${isLandscape ? " is-landscape" : " is-portrait"}`}>
        <img
          className={`uploaded-preview-image${previewClass}`}
          src={previewData.url}
          alt={`Preview of ${previewData.name}`}
          onLoad={onReady}
          onError={handleImageError}
        />
      </div>
    );
  }

  if (previewData && isPdf) {
    return (
      <object
        className={`uploaded-preview-document${previewClass}`}
        data={previewData.url}
        type="application/pdf"
        aria-label={`Preview of ${previewData.name}`}
        onLoad={onReady}
        onError={handleImageError}
      >
        <PaperPreview
          page={page}
          totalPages={totalPages}
          colour={colour}
          fileName={previewData.name}
          applyChanges={applyChanges}
          orientation={orientation}
          pagesPerSheet={pagesPerSheet}
          marginSize={marginSize}
        />
      </object>
    );
  }

  return (
    <PaperPreview
      page={page}
      totalPages={totalPages}
      colour={colour}
      fileName={previewData?.name ?? fileName}
      applyChanges={applyChanges}
      orientation={orientation}
      pagesPerSheet={pagesPerSheet}
      marginSize={marginSize}
    />
  );
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
          <FilePreview previewData={previewData} page={page} totalPages={totalPages} colour={isUpdated ? activeJob.colour : true} fileName={fileName} applyChanges={isUpdated} orientation={activeJob.orientation ?? "Portrait"} />
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

function PaperPreview({
  page = 1,
  totalPages = 12,
  colour,
  fileName = "Document",
  applyChanges = false,
  orientation = "Portrait",
  pagesPerSheet = 1,
  marginSize = "normal",
}: {
  page?: number;
  totalPages?: number;
  colour: boolean;
  fileName?: string;
  applyChanges?: boolean;
  orientation?: "Portrait" | "Landscape";
  pagesPerSheet?: number;
  marginSize?: "normal" | "narrow" | "none";
}) {
  const isLandscape = orientation === "Landscape";
  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const marginClass = marginSize === "narrow" ? " margin-narrow" : marginSize === "none" ? " margin-none" : "";
  const gridClass = pagesPerSheet === 2 ? " is-grid-2" : pagesPerSheet === 4 ? " is-grid-4" : "";

  if (pagesPerSheet === 2) {
    return (
      <div className={`paper${isLandscape ? " is-landscape" : " is-portrait"}${applyChanges && !colour ? " black-and-white-preview" : ""}${marginClass}${gridClass}`}>
        <div className="paper-grid-cell">
          <span className="paper-grid-cell-title">{title}</span>
          <div className="paper-grid-cell-lines">
            <span /><span /><span />
          </div>
          <span className="paper-grid-cell-num">Pg {page}</span>
        </div>
        <div className="paper-grid-cell">
          <span className="paper-grid-cell-title">{title}</span>
          <div className="paper-grid-cell-lines">
            <span /><span /><span />
          </div>
          <span className="paper-grid-cell-num">Pg {Math.min(totalPages, page + 1)}</span>
        </div>
      </div>
    );
  }

  if (pagesPerSheet === 4) {
    return (
      <div className={`paper${isLandscape ? " is-landscape" : " is-portrait"}${applyChanges && !colour ? " black-and-white-preview" : ""}${marginClass}${gridClass}`}>
        {[0, 1, 2, 3].map((offset) => {
          const cellPage = Math.min(totalPages, page + offset);
          return (
            <div key={offset} className="paper-grid-cell">
              <span className="paper-grid-cell-title">{title}</span>
              <div className="paper-grid-cell-lines">
                <span /><span />
              </div>
              <span className="paper-grid-cell-num">Pg {cellPage}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`paper${isLandscape ? " is-landscape" : " is-portrait"}${applyChanges && !colour ? " black-and-white-preview" : ""}${marginClass}`}>
      <div className="paper-title">{title}</div>
      <i /><i /><i /><i />
      <small>PRINT DOCUMENT · {isLandscape ? "LANDSCAPE" : "PORTRAIT"}</small><small>Page {page} of {totalPages}</small>
    </div>
  );
}

function UploadProgress({ fileName, progress, totalBytes, status, onRetry }: {
  fileName: string;
  progress: number;
  totalBytes: number;
  status: "uploading" | "preparing" | "ready" | "failed";
  onRetry?: () => void;
}) {
  const completedBytes = Math.round(totalBytes * progress / 100);
  const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return (
    <div className={`upload-progress-card${status === "failed" ? " failed" : ""}`} role="status" aria-live="polite">
      <div className="upload-progress-file">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 3.75h7l5 5V20a.75.75 0 0 1-.75.75h-11.5A.75.75 0 0 1 5 20V4.5a.75.75 0 0 1 .75-.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13 4v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span>{fileName}</span>
      </div>
      <div className="upload-progress-label">
        <span className="upload-progress-status">{status === "uploading" ? `Uploading... ${progress}%` : status === "preparing" ? "Preparing preview..." : status === "failed" ? "Upload failed. Please try again." : "Ready"}</span>
        {status !== "failed" && <span className="upload-progress-percent">{progress}%</span>}
      </div>
      {status !== "failed" && <div className="upload-progress-size">{formatSize(completedBytes)} of {formatSize(totalBytes)}</div>}
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
      {status === "failed" && onRetry && <button className="upload-retry-button" type="button" onClick={onRetry}>Retry</button>}
    </div>
  );
}

function UploadIllustration() {
  return <UploadHeroIllustration />;
}

function HomeExtras() {
  const shopStatus = getShopStatus();
  const isOpen = shopStatus.state === "open" || shopStatus.state === "closing-soon";

  return (
    <section className="printq-home-extras" aria-label="Print shop information">
      {/* Shop Status Banner */}
      <article className="home-shop-status-card" role="region" aria-label="Shop Status">
        <div className="home-shop-status-header">
          <div>
            <h2 className="home-shop-status-title">Campus Central Print Shop</h2>
            <p className="home-shop-status-hours">Mon–Fri: 9:30 AM – 5:00 PM · Sat &amp; Sun: Closed</p>
          </div>
          <div className={`shop-status-pill ${isOpen ? "open" : "closed"}`}>
            <span className={`status-dot ${isOpen ? "green" : "red"}`} />
            <span>{isOpen ? (shopStatus.state === "closing-soon" ? "Closing Soon" : "Open Now") : "Closed"}</span>
          </div>
        </div>
        <div className="home-shop-status-meta">
          <span className="home-shop-status-next">
            {isOpen ? `Open today until ${shopStatus.closingTime || "5:00 PM"}` : (shopStatus.nextOpeningText || "Opens Monday at 9:30 AM")}
          </span>
          <span className="home-shop-status-loc">Campus Central Building</span>
        </div>
      </article>
    </section>
  );
}

function Document({
  onBack,
  onPay,
  paymentNotice,
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
  setUploadReady,
  initialFiles,
  onInitialFilesConsumed,
  searchQuery,
  onNotifications,
  unreadCount = 0,
  authSession = null,
  onOpenAuth,
}: {
  onBack: () => void;
  onPay: (summary: LoginSummary) => void;
  paymentNotice: boolean;
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
  setUploadReady: (ready: boolean) => void;
  initialFiles?: File[];
  onInitialFilesConsumed?: () => void;
  searchQuery: string;
  onNotifications?: () => void;
  unreadCount?: number;
  authSession?: AuthUser | null;
  onOpenAuth?: () => void;
}) {
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [recentFiles, setRecentFiles] = useState<{ file: File; addedAt: number }[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "preparing" | "ready" | "failed">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [retryFiles, setRetryFiles] = useState<File[]>([]);
  const [uploadFileName, setUploadFileName] = useState("");
  const [pageRangeTouched, setPageRangeTouched] = useState(false);
  const [applyingSample, setApplyingSample] = useState<string | null>(null);
  const [uploadRunId, setUploadRunId] = useState(0);
  const uploadRunIdRef = useRef(0);
  const fileReadersRef = useRef<FileReader[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const progressTimerRef = useRef<number | null>(null);
  const finishProgressWaitRef = useRef<(() => void) | null>(null);
  const sampleTimerRef = useRef<number | null>(null);
  const autoNavTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const demoDocuments = [
    { name: "CS101_Lecture_Notes.pdf", pages: 14, title: "Lecture Notes", colour: false, singleSided: false, paper: "A4" },
    { name: "Algorithms_Review_Exam.pdf", pages: 8, title: "Review Exam", colour: false, singleSided: false, paper: "A4" },
    { name: "Architecture_Thesis_Book.pdf", pages: 320, title: "Thesis", colour: false, singleSided: false, paper: "A4" },
  ] as const;
  const matchingDemoDocuments = demoDocuments.filter((demo) => `${demo.name} ${demo.title} ${demo.pages} pages`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  useEffect(() => () => {
    if (sampleTimerRef.current !== null) window.clearTimeout(sampleTimerRef.current);
    if (autoNavTimerRef.current !== null) window.clearTimeout(autoNavTimerRef.current);
    uploadRunIdRef.current += 1;
    fileReadersRef.current.forEach((reader) => reader.readyState === FileReader.LOADING && reader.abort());
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const samples = [
    defaultPrintJob,
    quickPrints[1].preset,
    quickPrints[2].preset,
  ];
  const stopProgressEstimate = () => {
    if (progressTimerRef.current !== null) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    const finish = finishProgressWaitRef.current;
    finishProgressWaitRef.current = null;
    finish?.();
  };
  const selectDemoDocument = (demo: typeof demoDocuments[number]) => {
    const demoBytes = new Blob([`%PDF-1.4\n% PrintQ testing sample: ${demo.name}\n%%EOF`], { type: "application/pdf" }).size;
    const demoJob: PrintJob = {
      ...job,
      title: demo.title,
      fileName: demo.name,
      fileSize: `${Math.max(1, Math.round(demoBytes / 1024))} KB`,
      pages: demo.pages,
      colour: demo.colour,
      singleSided: demo.singleSided,
      paper: demo.paper,
      paperSurcharge: 0,
      pricePerPage: 2,
      sideSurcharge: 0,
      pageRange: "",
    };
    stopProgressEstimate();
    uploadRunIdRef.current += 1;
    fileReadersRef.current.forEach((reader) => reader.readyState === FileReader.LOADING && reader.abort());
    setUploadError("");
    setUploadComplete(true);
    setUploadStatus("ready");
    setUploadProgress(100);
    setUploadTotalBytes(demoBytes);
    setUploadFileName(demo.name);
    setRetryFiles([]);
    setPreviewData(null);
    setUploadedFiles([]);
    setJob(demoJob);
    setOriginalPrintJob(demoJob);
    setHasFile(true);
    setUploadReady(true);
  };
  const simulateUploadError = (message: string) => {
    stopProgressEstimate();
    uploadRunIdRef.current += 1;
    fileReadersRef.current.forEach((reader) => reader.readyState === FileReader.LOADING && reader.abort());
    setUploadError(message);
    setUploadComplete(false);
    setUploadStatus("idle");
    setUploadProgress(0);
    setRetryFiles([]);
    setPreviewData(null);
    setUploadedFiles([]);
    setHasFile(false);
    setUploadReady(false);
  };
  const getFileTypeBadge = (name?: string) => {
    const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return { label: "PDF", cls: "is-pdf" };
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return { label: "IMG", cls: "is-img" };
    return { label: "DOC", cls: "is-doc" };
  };

  const uploadFiles = async (selectedFiles?: FileList | File[]) => {
    const incoming = Array.from(selectedFiles ?? []);
    if (incoming.length === 0) return;

    const MAX_FILES = 5;
    const currentCount = uploadedFiles.length;
    const availableSlots = MAX_FILES - currentCount;

    if (availableSlots <= 0) {
      setUploadError("Maximum of 5 files reached. Delete a file to add another.");
      return;
    }

    const existingNames = new Set(uploadedFiles.map((f) => f.name.toLowerCase()));
    const nonDuplicates = incoming.filter((f) => !existingNames.has(f.name.toLowerCase()));

    if (nonDuplicates.length === 0) {
      setUploadError(incoming.length === 1 ? `"${incoming[0].name}" has already been added.` : "Selected file(s) have already been added.");
      return;
    }

    const files = nonDuplicates.slice(0, availableSlots);
    if (nonDuplicates.length > availableSlots) {
      setUploadError(`Only ${availableSlots} more file${availableSlots > 1 ? "s" : ""} added (maximum 4 files allowed).`);
    } else {
      setUploadError("");
    }

    const supportedExtensions = new Set(["pdf", "docx", "pptx", "jpg", "jpeg", "png"]);
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!supportedExtensions.has(ext)) {
        setUploadError(`"${file.name}" has an unsupported file type. Please choose PDF, DOCX, PPTX, JPG, or PNG.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`"${file.name}" is too large (max 50 MB).`);
        return;
      }
    }

    uploadRunIdRef.current += 1;
    const runId = uploadRunIdRef.current;
    stopProgressEstimate();
    setUploadRunId(runId);
    setUploadComplete(false);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setRetryFiles(files);
    setUploadFileName(files.map((file) => file.name).join(", "));
    setUploadReady(false);

    const totalBytes = Math.max(1, files.reduce((total, file) => total + file.size, 0));
    setUploadTotalBytes(totalBytes);
    const estimatedDuration = Math.min(1000, Math.max(450, (totalBytes / (1024 * 1024)) * 100));
    let readingComplete = false;
    const progressWait = new Promise<void>((resolve) => {
      finishProgressWaitRef.current = resolve;
      const startedAt = performance.now();
      progressTimerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAt;
        setUploadProgress(Math.min(99, Math.floor((elapsed / estimatedDuration) * 100)));
        if (elapsed >= estimatedDuration && readingComplete) {
          stopProgressEstimate();
          setUploadProgress(100);
        }
      }, 50);
    });

    const newUploaded = await Promise.all(files.map((selected) => new Promise<UploadedFileData>((resolve, reject) => {
      const reader = new FileReader();
      fileReadersRef.current.push(reader);
      reader.onload = () => {
        if (runId !== uploadRunIdRef.current) return reject(new DOMException("Upload cancelled", "AbortError"));
        const buffer = reader.result instanceof ArrayBuffer ? reader.result : new ArrayBuffer(0);
        const isPdf = selected.name.toLowerCase().endsWith(".pdf") || selected.type === "application/pdf";
        const isImage = isImageFile(selected.name, selected.type);
        const detectedPages = isPdf ? countPdfPages(buffer) : isImage ? 1 : 0;
        const pages = isImage ? 1 : (detectedPages || estimatedPageCount(selected.size, selected.name, selected.type));
        const url = URL.createObjectURL(selected);
        objectUrlsRef.current.push(url);
        resolve({
          url,
          type: selected.type,
          name: selected.name,
          size: selected.size < 1024 * 1024
            ? `${Math.max(1, Math.round(selected.size / 1024))} KB`
            : `${(selected.size / 1024 / 1024).toFixed(1)} MB`,
          pages,
          pagesEstimated: !detectedPages && !isImage,
        });
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
      reader.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
      reader.readAsArrayBuffer(selected);
    })));

    if (runId !== uploadRunIdRef.current) return;
    readingComplete = true;
    await progressWait;
    if (runId !== uploadRunIdRef.current) return;

    const combinedFiles = [...uploadedFiles, ...newUploaded];
    const latestFile = newUploaded[newUploaded.length - 1];
    setUploadedFiles(combinedFiles);
    setPreviewData(latestFile);
    setUploadProgress(100);
    setUploadStatus("ready");
    setUploadComplete(true);
    setUploadReady(true);
    setRetryFiles([]);
    files.forEach((file) => {
      setRecentFiles((current) => [{ file, addedAt: Date.now() }, ...current.filter(({ file: f }) => f.name !== file.name)].slice(0, 3));
    });
    resetPreviewHistory();

    const totalPages = combinedFiles.reduce((sum, f) => sum + (f.pages || 1), 0);
    const uploadedJob = {
      ...job,
      paper: job.paper || "A4",
      paperStock: job.paperStock || "Regular Paper",
      paperSurcharge: 0,
      stockSurcharge: 0,
      title: combinedFiles.length > 1 ? "Uploaded Documents" : latestFile.name.replace(/\.[^.]+$/, ""),
      fileName: latestFile.name,
      fileSize: latestFile.size,
      pages: totalPages,
    };
    setJob(uploadedJob);
    setOriginalPrintJob(uploadedJob);
    if (hasFile) {
      setHasFile(true);
    } else {
      if (autoNavTimerRef.current !== null) window.clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = window.setTimeout(() => {
        setHasFile(true);
        autoNavTimerRef.current = null;
      }, 450);
    }
  };

  const startUpload = (selection?: FileList | File[]) => {
    if (uploadStatus === "uploading" || uploadStatus === "preparing") return;
    const selected = Array.from(selection ?? []);
    if (!selected.length) return;
    void uploadFiles(selected).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      stopProgressEstimate();
      uploadRunIdRef.current += 1;
      fileReadersRef.current.forEach((reader) => reader.readyState === FileReader.LOADING && reader.abort());
      fileReadersRef.current = [];
      setUploadComplete(uploadedFiles.length > 0);
      setUploadStatus(uploadedFiles.length > 0 ? "ready" : "failed");
      setUploadError("We couldn't read that file. Please choose it again.");
    });
  };
  useEffect(() => {
    if (!initialFiles?.length) return;
    startUpload(initialFiles);
    onInitialFilesConsumed?.();
  }, [initialFiles]);
  const cancelUpload = () => {
    if (autoNavTimerRef.current !== null) {
      window.clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = null;
    }
    uploadRunIdRef.current += 1;
    stopProgressEstimate();
    fileReadersRef.current.forEach((reader) => reader.readyState === FileReader.LOADING && reader.abort());
    fileReadersRef.current = [];
    setUploadStatus(uploadedFiles.length > 0 ? "ready" : "idle");
    setUploadError("");
    setUploadProgress(0);
    setRetryFiles([]);
    setUploadFileName("");
    if (uploadedFiles.length === 0) {
      setUploadComplete(false);
      setHasFile(false);
      setUploadReady(false);
      setPreviewData(null);
    }
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
      setUploadStatus("ready");
      setUploadProgress(100);
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
  const removeAllUploadedFiles = () => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    });
    objectUrlsRef.current = [];
    setUploadedFiles([]);
    setHasFile(false);
    setPreviewData(null);
    setUploadComplete(false);
    setUploadStatus("idle");
    setUploadError("");
    setJob({
      ...job,
      title: "Uploaded Document",
      fileName: "",
      fileSize: "",
      pages: 1,
    });
  };

  const removeUploadedFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove?.url) {
      try { URL.revokeObjectURL(fileToRemove.url); } catch (_) {}
    }
    const remaining = uploadedFiles.filter((_, fileIndex) => fileIndex !== index);
    setUploadedFiles(remaining);

    if (remaining.length === 0) {
      setHasFile(false);
      setPreviewData(null);
      setUploadComplete(false);
      setUploadStatus("idle");
      setUploadError("");
      setJob({
        ...job,
        title: "Uploaded Document",
        fileName: "",
        fileSize: "",
        pages: 1,
      });
      return;
    }

    const removedActive = previewData?.name === fileToRemove?.name;
    const nextActive = removedActive
      ? (remaining[Math.min(index, remaining.length - 1)] ?? remaining[0])
      : (previewData ?? remaining[0]);
    setPreviewData(nextActive);

    const totalPages = remaining.reduce((sum, f) => sum + (f.pages || 1), 0);
    setJob({
      ...job,
      title: remaining.length > 1 ? "Uploaded Documents" : nextActive.name.replace(/\.[^.]+$/, ""),
      fileName: nextActive.name,
      fileSize: nextActive.size,
      pages: totalPages,
    });
  };
  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDropActive(false);
    startUpload(event.dataTransfer.files);
  };
  const displayFileSize = (bytes: number) => bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const isUploadBusy = uploadStatus === "uploading" || uploadStatus === "preparing";
  const displayedName = isUploadBusy ? uploadFileName : job.fileName;
  const displayedSize = isUploadBusy ? displayFileSize(uploadTotalBytes) : job.fileSize;
  const activeFile = previewData ?? uploadedFiles[0];
  const fileTypeLabel = activeFile?.name.split(".").pop()?.toUpperCase() ?? "FILE";
  const activeType = activeFile?.type.toLowerCase() ?? "";
  const isPdfPreview = Boolean(activeFile && (activeType === "application/pdf" || activeFile.name.toLowerCase().endsWith(".pdf")));
  const isImagePreview = Boolean(activeFile && (activeType.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(activeFile.name)));
  const [isEditingCopies, setIsEditingCopies] = useState(false);
  const [copiesInputVal, setCopiesInputVal] = useState("");
  const [copiesError, setCopiesError] = useState(false);
  const copiesInputRef = useRef<HTMLInputElement | null>(null);
  const copiesTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEditingCopies && copiesInputRef.current) {
      copiesInputRef.current.focus();
      copiesInputRef.current.select();
    }
  }, [isEditingCopies]);

  const handleStartEditCopies = () => {
    setIsEditingCopies(true);
    setCopiesInputVal(String(job.copies));
  };

  const handleConfirmCopies = () => {
    setIsEditingCopies(false);
    const trimmed = copiesInputVal.trim();
    if (!trimmed) return;

    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return;
    }

    const parsed = Math.floor(Number(trimmed));
    if (isNaN(parsed)) return;

    if (parsed < 1 || parsed > 50) {
      setCopiesError(true);
      if (copiesTimeoutRef.current) clearTimeout(copiesTimeoutRef.current);
      copiesTimeoutRef.current = window.setTimeout(() => {
        setCopiesError(false);
      }, 1000);

      const clamped = parsed <= 0 ? 1 : 50;
      updateJob({ copies: clamped });
    } else {
      setCopiesError(false);
      updateJob({ copies: parsed });
    }
  };

  const [customRangeInput, setCustomRangeInput] = useState(job.pageRange || "");
  const [customRangeError, setCustomRangeError] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [hasCustomSavedPreset, setHasCustomSavedPreset] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(userCustomPresetKey));
    } catch {
      return false;
    }
  });
  const [presetSavedFeedback, setPresetSavedFeedback] = useState<string>("");
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const previewTotalPages = Math.max(1, activeFile?.pages ?? (uploadedFiles.length > 0 ? uploadedFiles[0].pages : job.pages));

  const rawPagesPerSet = uploadedFiles.length > 0
    ? uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0)
    : Math.max(1, activeFile?.pages ?? job.pages);

  const parsedRange = useMemo(() => {
    if (job.pageRangeMode === "custom") {
      return parsePageRangeInput(customRangeInput, rawPagesPerSet);
    }
    return { valid: true, pages: [] };
  }, [job.pageRangeMode, customRangeInput, rawPagesPerSet]);

  const effectivePagesPerSet = useMemo(() => {
    if (job.pageRangeMode === "current") {
      return 1;
    }
    if (job.pageRangeMode === "custom") {
      if (parsedRange.valid && parsedRange.pages.length > 0) {
        return parsedRange.pages.length;
      }
      return rawPagesPerSet;
    }
    return rawPagesPerSet;
  }, [job.pageRangeMode, parsedRange, rawPagesPerSet]);

  const pagesPerSet = effectivePagesPerSet;
  const copiesCount = Math.max(1, job.copies || 1);
  const totalPages = effectivePagesPerSet * copiesCount;

  const pagesPerSheet = Math.max(1, job.pagesPerSheet || 1);
  const printableSidesPerCopy = Math.ceil(effectivePagesPerSet / pagesPerSheet);

  const currentPricing = calculateJobPricing({
    ...job,
    pages: effectivePagesPerSet,
  }, uploadedFiles.length || 1);

  const unitPageRate = currentPricing.unitRate;
  const sidesCount = currentPricing.sheetsPerFile;
  const totalSheets = currentPricing.totalSheets;
  const printTotal = currentPricing.printSubtotal;
  const bindingTotal = currentPricing.bindingSubtotal;
  const calculatedTotal = currentPricing.grandTotal;

  const currentEstimate = calculateEstimatedReadyTime({
    pages: hasFile ? effectivePagesPerSet : 0,
    copies: copiesCount,
    colour: job.colour,
    paperStock: job.paperStock,
    requestedPickupMinutes: job.readyMinutes,
  });
  const activeStockName = normalizePaperStock(job.paperStock);
  const doubleSupported = isDoubleSidedAvailable(activeStockName);
  const singlePricePerSheet = getPricePerSheet(activeStockName, job.paper || "A4", true, job.colour);
  const doublePricePerSheet = doubleSupported ? getPricePerSheet(activeStockName, job.paper || "A4", false, job.colour) : null;

  useEffect(() => {
    if (!doubleSupported && !job.singleSided) {
      setJob((prev) => ({ ...prev, singleSided: true }));
    }
  }, [doubleSupported, job.singleSided, setJob]);

  const updateJob = (changes: Partial<PrintJob>) => setJob({ ...job, ...changes });

  return (
    <section className={`printq-document-page${hasFile ? " has-file" : " upload-only"}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <input ref={fileInputRef} id="printq-upload-file" className="sr-only" type="file" multiple accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png" aria-label="Upload file" onChange={(event) => { startUpload(event.currentTarget.files ?? undefined); event.currentTarget.value = ""; }} />
      {!hasFile ? (
        <div className="upload-screen">
          <UploadIllustration />
          <div className="upload-screen-intro">
            <h2 className="upload-heading">Upload your files</h2>
            <p className="upload-helper-text">Upload up to 5 files · Max 50 MB per file</p>
            <div className="upload-counter-pill" aria-live="polite">
              <span className={`upload-counter-dot${uploadedFiles.length > 0 ? " has-files" : ""}`} />
              <span>{uploadedFiles.length} of 5 files uploaded</span>
            </div>
          </div>

          {/* Turn-around estimate banner */}
          <div className="upload-eta-banner" role="status">
            <span className="upload-eta-icon" aria-hidden="true">⏱</span>
            <div className="upload-eta-text">
              <strong>{uploadedFiles.length > 0 ? currentEstimate.primaryText : "Add a file to see estimated time"}</strong>
              <small>{uploadedFiles.length > 0 ? currentEstimate.subText : "Upload a document to calculate completion time"}</small>
            </div>
          </div>

          <button
            className={`upload-drop-zone${dropActive ? " is-drag-active" : ""}${uploadedFiles.length >= 4 ? " is-disabled" : ""}`}
            type="button"
            aria-describedby="upload-supported-types"
            disabled={uploadedFiles.length >= 4}
            onClick={() => {
              if (uploadedFiles.length < 4) {
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={() => {
              if (uploadedFiles.length < 4) setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDragOver={(event) => {
              event.preventDefault();
              if (uploadedFiles.length < 4) setDropActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDropActive(false);
              if (uploadedFiles.length >= 4) {
                setUploadError("Maximum 4 files reached. Delete a file to add another.");
                return;
              }
              startUpload(event.dataTransfer.files);
            }}
          >
            {uploadedFiles.length >= 4 ? (
              <>
                <span className="upload-icon-container is-max-reached">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </span>
                <strong className="upload-max-text">Maximum 4 files reached</strong>
                <span className="upload-browse-hint">Delete a file below to make room for new ones</span>
              </>
            ) : (
              <>
                <span className="upload-icon-container">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m17 8-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                </span>
                <strong>Tap to upload or browse files</strong>
                <span className="upload-browse-hint">or drag and drop files here</span>
                <span className="upload-file-types" id="upload-supported-types">
                  {["PDF", "DOCX", "PPTX", "JPG", "PNG"].map((type) => (
                    <span key={type}>{type}</span>
                  ))}
                </span>
              </>
            )}
          </button>

          {uploadStatus === "uploading" && (
            <UploadProgress
              fileName={uploadFileName}
              progress={uploadProgress}
              totalBytes={uploadTotalBytes}
              status="uploading"
            />
          )}

          {uploadError && <p className="printq-upload-error" role="alert">{uploadError}</p>}

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files-section">
              <div className="uploaded-files-list" role="status" aria-live="polite">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="uploaded-file-minimal-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setHasFile(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setHasFile(true);
                      }
                    }}
                    title="Click to view Print Settings"
                  >
                    <div className="uploaded-file-minimal-left">
                      <span className="uploaded-file-minimal-name">{file.name}</span>
                      <span className="uploaded-file-minimal-status">
                        <svg
                          className="uploaded-success-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>File uploaded successfully</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <HomeExtras language={language} go={go} activeOrder={activeOrder} nowServing={nowServing} />
        </div>
      ) : (
        <div className="settings-screen">
          <header className="settings-screen-header">
            <button className="settings-screen-back" type="button" onClick={() => setHasFile(false)} aria-label="Go back to Upload File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <h1>Print Settings</h1>
            <span className="settings-step-indicator">Step 2/3</span>
          </header>

          {/* Screen 2: Sticky bar below header */}
          <div className="settings-sticky-eta-bar" role="status" aria-live="polite">
            <div className="settings-sticky-eta-left">
              <span className="settings-sticky-eta-icon" aria-hidden="true">⏱</span>
              <div className="settings-sticky-eta-text">
                <strong>{currentEstimate.primaryText}</strong>
                <small>{currentEstimate.subText}</small>
              </div>
            </div>
            <span className="settings-sticky-eta-badge">
              {currentEstimate.isQueueAvailable && <span className="live-radar-dot" aria-hidden="true" />}
              {currentEstimate.isQueueAvailable ? "Live Queue" : "Estimate"}
            </span>
          </div>

          {/* 1. File Preview Display at Top of Screen */}
          <div className="settings-preview-card">
            <div className="settings-preview-header">
              <div className="settings-preview-fileinfo">
                <span className={`upload-recent-icon ${getFileTypeBadge(activeFile?.name ?? displayedName).cls}`}>
                  {getFileTypeBadge(activeFile?.name ?? displayedName).label}
                </span>
                <div className="settings-preview-meta">
                  <strong className="settings-preview-filename" title={activeFile?.name ?? displayedName}>
                    {activeFile?.name ?? displayedName}
                  </strong>
                  <span className="settings-preview-submeta">
                    {activeFile?.size ?? displayedSize} · {activeFile?.pages ?? 1} {((activeFile?.pages ?? 1) === 1) ? 'page' : 'pages'}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                
                <span className="settings-files-counter-badge">
                  {uploadedFiles.length}/4 Files
                </span>
              </div>
            </div>

            <div
              className={`settings-preview-viewport${(job.orientation ?? "Portrait") === "Landscape" ? " is-landscape" : " is-portrait"}`}
              onClick={preview}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  preview();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Tap to view full page preview"
              style={{ cursor: "pointer" }}
              title="Click to view full screen preview"
            >
              <FilePreview
                previewData={activeFile}
                page={previewCurrentPage}
                totalPages={previewTotalPages}
                colour={job.colour}
                fileName={activeFile?.name ?? displayedName}
                applyChanges={true}
                orientation={job.orientation ?? "Portrait"}
                pagesPerSheet={job.pagesPerSheet ?? 1}
                marginSize={job.marginSize ?? "normal"}
              />
            </div>

            {/* Directly below the file preview, two buttons side by side */}
            <div className="settings-preview-actions">
              <button
                type="button"
                className={`settings-action-btn settings-add-btn${uploadedFiles.length >= 4 ? " is-disabled" : ""}`}
                onClick={() => {
                  if (uploadedFiles.length < 4) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={uploadedFiles.length >= 4}
                title={uploadedFiles.length >= 4 ? "Maximum 4 files reached" : "Add more files (up to 4)"}
                aria-label="Add More Files"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{uploadedFiles.length >= 4 ? "Max 4 Files" : "Add More Files"}</span>
              </button>

              <button
                type="button"
                className="settings-action-btn settings-delete-btn"
                onClick={removeAllUploadedFiles}
                aria-label="Delete all uploaded files"
                title="Delete all uploaded files"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete All Files</span>
              </button>
            </div>
          </div>

          {uploadError && <p className="printq-upload-error" role="alert" style={{ margin: "-6px 0 0" }}>{uploadError}</p>}

          {/* Multiple Files List */}
          {uploadedFiles.length > 1 && (
            <div className="settings-files-tray" role="region" aria-label="All uploaded files">
              <div className="settings-files-tray-header">
                <span>Uploaded Files ({uploadedFiles.length}/4)</span>
                {uploadedFiles.length < 4 ? (
                  <button
                    type="button"
                    className="settings-add-inline-link"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    + Add File
                  </button>
                ) : (
                  <span className="settings-tray-max-badge">Max Limit Reached</span>
                )}
              </div>
              <div className="settings-files-list">
                {uploadedFiles.map((file, idx) => {
                  const isSelected = file.name === (activeFile?.name ?? displayedName);
                  const badge = getFileTypeBadge(file.name);
                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className={`settings-file-row${isSelected ? " is-active" : ""}`}
                      onClick={() => {
                        setPreviewData(file);
                        setJob({ ...job, fileName: file.name, fileSize: file.size });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setPreviewData(file);
                          setJob({ ...job, fileName: file.name, fileSize: file.size });
                        }
                      }}
                    >
                      <span className={`upload-recent-icon ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <div className="settings-file-row-info">
                        <strong title={file.name}>{file.name}</strong>
                        <small>{file.size} · {file.pages ?? 1} {(file.pages ?? 1) === 1 ? 'page' : 'pages'}</small>
                      </div>
                      {isSelected && (
                        <span className="settings-file-active-badge">Previewing</span>
                      )}
                      <button
                        type="button"
                        className="settings-file-delete-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedFile(idx);
                        }}
                        aria-label={`Delete ${file.name}`}
                        title={`Delete ${file.name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BATCH 2: Grayscale Legibility Checker (for B&W mode) */}
          <LegibilityChecker
            isColour={job.colour}
            totalPages={previewTotalPages}
            fileName={activeFile?.name ?? displayedName}
            onSwitchToColour={() => {
              updateJob({ colour: true });
            }}
            onInspectPage={(p) => {
              setPreviewCurrentPage(p);
              preview();
            }}
          />

          {/* BATCH 2: Deadline Check Interface */}
          <DeadlineCheckCard
            currentEstimate={currentEstimate}
            onDeadlineSelected={(mins) => {
              updateJob({ readyMinutes: mins });
            }}
          />

          {/* Section 2: Number of Copies */}
          <section className="settings-section settings-copies-section" aria-labelledby="heading-number-of-copies">
            <div className="settings-section-header-row">
              <h2 id="heading-number-of-copies" className="settings-section-title">Number of Copies</h2>
              <span className="settings-copies-badge">Set quantity first</span>
            </div>
            <div className="settings-copies-card">
              <div className="settings-copies-stepper-row" role="group" aria-label="Number of copies stepper">
                <button
                  type="button"
                  className={`settings-stepper-btn${job.copies <= 1 ? " is-disabled" : ""}`}
                  aria-label="Decrease copies"
                  disabled={job.copies <= 1}
                  onClick={() => updateJob({ copies: Math.max(1, job.copies - 1) })}
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <div
                  className={`settings-stepper-value-container${isEditingCopies ? " is-active" : ""}${copiesError ? " has-error" : ""}`}
                  onClick={!isEditingCopies ? handleStartEditCopies : undefined}
                  role="spinbutton"
                  aria-label={`Number of copies, currently ${job.copies}`}
                  aria-valuenow={job.copies}
                  aria-valuemin={1}
                  aria-valuemax={50}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!isEditingCopies && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleStartEditCopies();
                    }
                  }}
                  title="Tap to type custom number of copies"
                >
                  {isEditingCopies ? (
                    <input
                      ref={copiesInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="settings-stepper-input"
                      value={copiesInputVal}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "");
                        setCopiesInputVal(cleaned);
                      }}
                      onBlur={handleConfirmCopies}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          setIsEditingCopies(false);
                        }
                      }}
                      aria-label="Enter number of copies (1-50)"
                    />
                  ) : (
                    <span key={job.copies} className="settings-stepper-value-text" aria-live="polite">
                      {job.copies}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className={`settings-stepper-btn${job.copies >= 50 ? " is-disabled" : ""}`}
                  aria-label="Increase copies"
                  disabled={job.copies >= 50}
                  onClick={() => updateJob({ copies: Math.min(50, job.copies + 1) })}
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              <p className="settings-copies-calculation" aria-live="polite">
                Total pages: {effectivePagesPerSet} × {job.copies} {job.copies > 1 ? "copies" : "copy"} = {totalPages} pages
              </p>
            </div>
          </section>

          {/* Section 4: Print Option */}
          <section className="settings-section" aria-labelledby="heading-print-option">
            <h2 id="heading-print-option" className="settings-section-title">Print Option</h2>
            <div className="settings-cards-stack" role="radiogroup" aria-labelledby="heading-print-option">
              <label className={`settings-radio-card${!job.colour ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="print-option"
                  value="bw"
                  checked={!job.colour}
                  onChange={() => {
                    setActivePresetId(null);
                    updateJob({ colour: false, pricePerPage: 2 });
                  }}
                  className="sr-only"
                />
                <span className="settings-radio-circle" aria-hidden="true">
                  {!job.colour && <span className="settings-radio-dot" />}
                </span>
                <span className="settings-card-content">
                  <span className="settings-card-header">
                    <span className="settings-card-title">Black &amp; White</span>
                    <span className="settings-card-price">₹2.00 / page</span>
                  </span>
                  <p className="settings-card-desc">Standard printing for documents, forms, and notes.</p>
                </span>
              </label>
              <label className={`settings-radio-card${job.colour ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="print-option"
                  value="colour"
                  checked={job.colour}
                  onChange={() => {
                    setActivePresetId(null);
                    updateJob({ colour: true, pricePerPage: 8 });
                  }}
                  className="sr-only"
                />
                <span className="settings-radio-circle" aria-hidden="true">
                  {job.colour && <span className="settings-radio-dot" />}
                </span>
                <span className="settings-card-content">
                  <span className="settings-card-header">
                    <span className="settings-card-title">Full Colour</span>
                    <span className="settings-card-price">₹8.00 / page</span>
                  </span>
                  <p className="settings-card-desc">Vibrant colour printing for presentations, charts, and graphics.</p>
                </span>
              </label>
            </div>
          </section>

          {/* Section 5: Printing Side */}
          <section className="settings-section" aria-labelledby="heading-printing-side">
            <h2 id="heading-printing-side" className="settings-section-title">Printing Side</h2>

            {!doubleSupported && (
              <div className="settings-restriction-alert" role="alert">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Double-sided not available for {activeStockName}.</span>
              </div>
            )}

            <div className="settings-cards-stack" role="radiogroup" aria-labelledby="heading-printing-side">
              <label className={`settings-radio-card${job.singleSided || !doubleSupported ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="printing-side"
                  value="single"
                  checked={job.singleSided || !doubleSupported}
                  onChange={() => {
                    setActivePresetId(null);
                    updateJob({ singleSided: true, sideSurcharge: 0 });
                  }}
                  className="sr-only"
                />
                <span className="settings-radio-circle" aria-hidden="true">
                  {(job.singleSided || !doubleSupported) && <span className="settings-radio-dot" />}
                </span>
                <span className="settings-card-content">
                  <span className="settings-card-header">
                    <span className="settings-card-title">Single-Sided</span>
                    <span className="settings-card-price">₹{singlePricePerSheet.toFixed(2)} / sheet</span>
                  </span>
                  <p className="settings-card-desc">Print on one side of each sheet. Ideal for resumes and official forms.</p>
                </span>
              </label>

              <label className={`settings-radio-card${!doubleSupported ? " is-disabled" : ""}${!job.singleSided && doubleSupported ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="printing-side"
                  value="double"
                  disabled={!doubleSupported}
                  checked={!job.singleSided && doubleSupported}
                  onChange={() => {
                    if (!doubleSupported) return;
                    setActivePresetId(null);
                    updateJob({ singleSided: false, sideSurcharge: 0 });
                  }}
                  className="sr-only"
                />
                <span className="settings-radio-circle" aria-hidden="true">
                  {!job.singleSided && doubleSupported && <span className="settings-radio-dot" />}
                </span>
                <span className="settings-card-content">
                  <span className="settings-card-header">
                    <span className="settings-card-title">Double-Sided</span>
                    <span className="settings-card-price">
                      {doubleSupported ? `₹${doublePricePerSheet?.toFixed(2)} / sheet` : "Not Available"}
                    </span>
                  </span>
                  <p className="settings-card-desc">
                    {doubleSupported
                      ? "Save paper by printing on both sides of each sheet (Eco-Friendly)."
                      : `Double-sided printing is not available on heavy or specialty ${activeStockName}.`}
                  </p>
                </span>
              </label>
            </div>
          </section>

          {/* Section 6: Paper Size */}
          <section className="settings-section" aria-labelledby="heading-paper-size">
            <h2 id="heading-paper-size" className="settings-section-title">Paper Size</h2>
            <div className="settings-grid-2col" role="radiogroup" aria-labelledby="heading-paper-size">
              {PAPER_SIZE_CONFIG.map(({ size, dim, isLargeFormat, note }) => {
                const isSelected = (job.paper ?? "A4") === size;
                const sizeRate = getPricePerSheet(activeStockName, size, job.singleSided || !doubleSupported, job.colour);
                return (
                  <label
                    key={size}
                    className={`settings-paper-card${isSelected ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paper-size"
                      value={size}
                      checked={isSelected}
                      onChange={() => {
                        setActivePresetId(null);
                        updateJob({ paper: size, paperSurcharge: 0 });
                      }}
                      className="sr-only"
                    />
                    <span className="settings-paper-content">
                      <strong className="settings-card-title">{size}</strong>
                      <small className="settings-card-desc">{dim}</small>
                      <span className="settings-card-price" style={{ fontSize: "11px", marginTop: "2px" }}>
                        ₹{sizeRate.toFixed(2)} / sheet
                      </span>
                      {isLargeFormat && (
                        <span className="settings-large-format-note">
                          {note}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Section 7: Paper Type Dropdown */}
          <section className="settings-section" aria-labelledby="heading-paper-type">
            <h2 id="heading-paper-type" className="settings-section-title">Paper Type</h2>
            <div className="settings-paper-dropdown-wrap">
              <label htmlFor="settings-paper-stock-select" className="sr-only">Choose Paper Type</label>
              <div className="settings-select-container">
                <select
                  id="settings-paper-stock-select"
                  className="settings-paper-select"
                  value={activeStockName}
                  onChange={(e) => {
                    const newStock = e.target.value;
                    setActivePresetId(null);
                    const config = PAPER_STOCK_CONFIG.find((p) => p.name === newStock);
                    const willBeSingle = config && !config.doubleAllowed ? true : job.singleSided;
                    updateJob({
                      paperStock: newStock,
                      singleSided: willBeSingle,
                      stockSurcharge: 0,
                    });
                  }}
                  aria-label="Select paper type"
                >
                  {PAPER_STOCK_CONFIG.map(({ name, gsm }) => (
                    <option key={name} value={name} className="settings-paper-option">
                      {name} · {gsm}
                    </option>
                  ))}
                </select>
                <div className="settings-select-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <p className="settings-paper-dropdown-helper" aria-live="polite">
                Current selection: <strong style={{ color: "var(--accent)" }}>{activeStockName}</strong> ({PAPER_STOCK_CONFIG.find(p => p.name === activeStockName)?.gsm}) · ₹{singlePricePerSheet.toFixed(2)}/sheet
              </p>
            </div>
          </section>

          {/* Section 8: Page Layout */}
          <section className="settings-section" aria-labelledby="heading-page-orientation">
            <div className="settings-section-header-row">
              <h2 id="heading-page-orientation" className="settings-section-title">Page Layout</h2>
              <span className="settings-copies-badge">{job.orientation ?? "Portrait"}</span>
            </div>
            <div className="settings-grid-2col" role="radiogroup" aria-labelledby="heading-page-orientation">
              {[
                {
                  id: "Portrait",
                  title: "Portrait",
                  subtitle: "Vertical Layout",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="3" width="14" height="18" rx="2" />
                      <line x1="9" y1="7" x2="15" y2="7" />
                      <line x1="9" y1="11" x2="15" y2="11" />
                    </svg>
                  ),
                },
                {
                  id: "Landscape",
                  title: "Landscape",
                  subtitle: "Horizontal Layout",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <line x1="7" y1="9" x2="17" y2="9" />
                      <line x1="7" y1="13" x2="17" y2="13" />
                    </svg>
                  ),
                },
              ].map((opt) => {
                const isSelected = (job.orientation ?? "Portrait") === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`settings-paper-card settings-orientation-card${isSelected ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="page-orientation"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => updateJob({ orientation: opt.id as "Portrait" | "Landscape" })}
                      className="sr-only"
                    />
                    <span className="settings-orientation-icon" aria-hidden="true">
                      {opt.icon}
                    </span>
                    <span className="settings-paper-content">
                      <strong className="settings-card-title">{opt.title}</strong>
                      <small className="settings-card-desc">{opt.subtitle}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          

          

          

          {/* Section 17: Price Summary Breakdown & Sticky Bottom Bar */}
          <div className="settings-summary-box" role="region" aria-label="Price summary breakdown">
            {/* Live Formula Banner */}
            <div className="settings-formula-banner">
              <div className="settings-formula-spec">{currentPricing.formulaSummary}</div>
              <div className="settings-formula-calc">
                <span>₹{currentPricing.unitRate} per sheet × {currentPricing.totalSheets} {currentPricing.totalSheets === 1 ? "sheet" : "sheets"}</span>
                <strong>₹{currentPricing.printSubtotal.toFixed(2)}</strong>
              </div>
              {currentPricing.bindingSubtotal > 0 && (
                <div className="settings-formula-calc settings-formula-binding">
                  <span>+ Binding ({job.copies} {job.copies > 1 ? "sets" : "set"})</span>
                  <strong>+₹{currentPricing.bindingSubtotal.toFixed(2)}</strong>
                </div>
              )}
            </div>

            <div className="settings-summary-header">
              <span className="settings-summary-title">Price Summary</span>
              <span className="settings-summary-pages-tag">{currentPricing.totalSheets} {currentPricing.totalSheets === 1 ? "sheet" : "sheets"}</span>
            </div>

            <div className="settings-summary-lines">
              <div className="settings-summary-row">
                <span>Print Option:</span>
                <span>{job.colour ? "Full Colour (₹8.00 / page)" : "Black & White (₹2.00 / page)"}</span>
              </div>
              <div className="settings-summary-row">
                <span>Print Side:</span>
                <span>{currentPricing.sideLabel} (₹{currentPricing.unitRate.toFixed(2)} / sheet)</span>
              </div>
              <div className="settings-summary-row">
                <span>Paper Size:</span>
                <span>{currentPricing.size}</span>
              </div>
              <div className="settings-summary-row">
                <span>Paper Type:</span>
                <span>{currentPricing.stock}</span>
              </div>
              <div className="settings-summary-row">
                <span>Orientation:</span>
                <span>{job.orientation ?? "Portrait"}</span>
              </div>
              {pagesPerSheet > 1 && (
                <div className="settings-summary-row">
                  <span>Pages per sheet ({pagesPerSheet}):</span>
                  <span style={{ color: "var(--success)" }}>50% less paper</span>
                </div>
              )}
              {currentPricing.bindingSubtotal > 0 && (
                <div className="settings-summary-row">
                  <span>Binding ({job.bindingOption === "spiral" ? "Spiral Binding" : "Staple"}):</span>
                  <span>+₹{currentPricing.bindingSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="settings-summary-row settings-summary-rate-row">
                <span>Rate per sheet:</span>
                <strong>₹{currentPricing.unitRate.toFixed(2)}</strong>
              </div>
              <div className="settings-summary-row">
                <span>Sheets per copy:</span>
                <span>{currentPricing.sheetsPerFile} {currentPricing.sheetsPerFile === 1 ? "sheet" : "sheets"}</span>
              </div>
              <div className="settings-summary-row">
                <span>Number of copies:</span>
                <span>× {job.copies} {job.copies > 1 ? "copies" : "copy"}</span>
              </div>
              {uploadedFiles.length > 1 && (
                <div className="settings-summary-row">
                  <span>Total uploaded files:</span>
                  <span>× {uploadedFiles.length} files</span>
                </div>
              )}
            </div>

            <div className="settings-summary-total">
              <span>Total Amount</span>
              <strong>₹{currentPricing.grandTotal.toFixed(2)}</strong>
            </div>

            <span className="settings-summary-note">
              Final price confirmed at checkout.
            </span>
          </div>

          {/* Fixed Bottom Checkout Bar */}
          <div className="settings-bottom-bar" role="region" aria-label="Order total">
            <div className="settings-bottom-total">
              <small>Total · Ready in ~{currentEstimate.minutes} mins</small>
              <strong>₹{calculatedTotal.toFixed(2)}</strong>
            </div>
            <button
              type="button"
              className="settings-bottom-btn"
              onClick={() => onPay({
                fileName: uploadedFiles.length > 1 ? `${uploadedFiles[0].name} + ${uploadedFiles.length - 1} more` : displayedName,
                pages: totalPages,
                copies: job.copies,
                total: `₹${calculatedTotal.toFixed(2)}`
              })}
            >
              Continue to Pay
            </button>
          </div>
        </div>
      )}
    </section>
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

function RadioChoiceCard({ group, title, detail, price, checked, onChange }: { group: string; title: string; detail?: string; price?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`printq-radio-card${checked ? " selected" : ""}`}>
      <input type="radio" name={group} checked={checked} onChange={onChange} />
      <span className="printq-radio-copy">
        <strong>{title}</strong>
        {price && <small>{price}</small>}
        {detail && <small>{detail}</small>}
      </span>
    </label>
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
  const paperOptions = [
    { size: "A4", surcharge: 0 },
    { size: "A3", surcharge: 1 },
    { size: "Legal", surcharge: 0 },
  ];
  useEffect(() => {
    if (!paperOptions.some((option) => option.size === job.paper)) {
      setJob({ ...job, paper: "A4", paperSurcharge: 0 });
    }
  }, [job.paper]);

  return (
    <section className="studio page">
      <h2 id="print-color-mode-label">Color Mode</h2>
      <fieldset className="printq-radio-group" aria-labelledby="print-color-mode-label">
        <RadioChoiceCard group="print-color-mode" title="Black & White" detail="Standard print for assignments & docs" price={"₹2.00 / page"} checked={!job.colour} onChange={() => setJob({ ...job, colour: false, pricePerPage: 2 })} />
        <RadioChoiceCard group="print-color-mode" title="Full Colour" detail="Standard print for assignments & docs" price={"₹8.00 / page"} checked={job.colour} onChange={() => setJob({ ...job, colour: true, pricePerPage: 8 })} />
      </fieldset>
      <h2 id="print-side-label">Printing Side</h2>
      <fieldset className="printq-radio-group" aria-labelledby="print-side-label">
        <RadioChoiceCard
          group="print-side"
          title="Single Sided"
          price={`₹${getPricePerSheet(job.paperStock || "Regular Paper", job.paper || "A4", true, job.colour).toFixed(2)} / sheet`}
          detail="Standard print on one side of each sheet"
          checked={job.singleSided}
          onChange={() => setJob({ ...job, singleSided: true, sideSurcharge: 0 })}
        />
        <RadioChoiceCard
          group="print-side"
          title="Double Sided (Duplex)"
          price={`₹${getPricePerSheet(job.paperStock || "Regular Paper", job.paper || "A4", false, job.colour).toFixed(2)} / sheet`}
          detail="Eco-Friendly (Save 50% Paper)"
          checked={!job.singleSided}
          onChange={() => setJob({ ...job, singleSided: false, sideSurcharge: 0 })}
        />
      </fieldset>
      <fieldset className="printq-radio-group is-inline">
        <legend>Paper Size</legend>
        {paperOptions.map(({ size, surcharge }) => <RadioChoiceCard key={size} group="paper-size" title={size} checked={job.paper === size} onChange={() => setJob({ ...job, paper: size, paperSurcharge: surcharge })} />)}
      </fieldset>
      <h2>Page layout</h2>
      <label className="printq-field-label">Orientation</label>
      <div className="printq-choice-row" role="group" aria-label="Orientation">
        {(["Portrait", "Landscape"] as const).map((orientation) => <button key={orientation} type="button" aria-pressed={(job.orientation ?? "Portrait") === orientation} className={(job.orientation ?? "Portrait") === orientation ? "active" : ""} onClick={() => setJob({ ...job, orientation })}>{orientation}</button>)}
      </div>
    </section>
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
  const speedMinutes: Record<string, number> = { "10 min": 10, "30 min": 30, "1 hour": 60, "2 hour": 120 };
  return (
    <section className="studio page">
      <h2>Paper Material & Stock</h2>
      <PaperStockGrid
        selected={job.stockIndex}
        onSelect={(stockIndex, stockSurcharge) => setJob({ ...job, stockIndex, stockSurcharge })}
      />
      <fieldset className="printq-radio-group is-stacked printq-collection-time">
        <legend>When would you like to collect it?</legend>
        <p className="printq-ready-time">Estimated ready in {job.readyMinutes ?? 10} minutes</p>
        {[ ["10 min", "After print 10 min"], ["30 min", "After print 30 min"], ["1 hour", "After print 1 Hour"], ["2 hour", "After print 2 hour"] ].map(([title, detail]) => (
          <RadioChoiceCard key={title} group="collection-time" title={title} detail={detail} checked={speed === title} onChange={() => { setSpeed(title); setJob({ ...job, readyMinutes: speedMinutes[title] }); }} />
        ))}
      </fieldset>
      <h2>Number of Copies</h2>
      <div className="counter">
        <button onClick={() => setJob({ ...job, copies: Math.max(1, job.copies - 1) })}>−</button>
        <strong>{job.copies}</strong>
        <button onClick={() => setJob({ ...job, copies: job.copies + 1 })}>+</button>
        <small>{job.copies === 1 ? "copy set" : "copy sets"}</small>
        <em>{getSelectedPageCount(job)} pages in each set</em>
      </div>
    </section>
  );
}

function PrintPriceSummary({ job }: { job: PrintJob }) {
  const pricing = calculateJobPricing(job, 1);
  return (
    <section className="printq-price-summary" aria-labelledby="printq-price-title">
      <h2 id="printq-price-title">Price summary</h2>
      <dl>
        <dt>Selected pages</dt><dd>{job.pageRange?.trim() || "All pages"} ({getSelectedPageCount(job)})</dd>
        <dt>Copies</dt><dd>{job.copies}</dd>
        <dt>Print Option</dt><dd>{pricing.optionLabel} (₹{pricing.optionRate.toFixed(2)} / page)</dd>
        <dt>Print Side</dt><dd>{pricing.sideLabel} (₹{pricing.unitRate.toFixed(2)} / sheet)</dd>
        <dt>Paper</dt><dd>{pricing.stock} · {pricing.size} · {job.orientation ?? "Portrait"}</dd>
        <dt>Estimated ready</dt><dd>{job.readyMinutes ?? 10} minutes</dd>
        <dt className="printq-price-total-label">Total</dt><dd className="printq-price-total">{formatPrice(job)}</dd>
      </dl>
      {job.noteToShop?.trim() && <p>Note to shop: {job.noteToShop}</p>}
    </section>
  );
}

function Checkout({
  go,
  preview,
  job,
  onOrderConfirmed,
  uploadedFiles,
}: {
  go: (screen: Screen) => void;
  preview: () => void;
  job: PrintJob;
  onOrderConfirmed: (token?: string) => void;
  uploadedFiles: UploadedFileData[];
}) {
  const [payment, setPayment] = useState<"UPI" | "Cash">("UPI");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "bhim">("gpay");
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "success">("idle");
  const [paymentProgress, setPaymentProgress] = useState(0);

  // Dedicated Payment Processing Modal State
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [processStatus, setProcessStatus] = useState<PaymentProcessStatus>("idle");
  const [assignedToken, setAssignedToken] = useState("");
  const [queueMetrics, setQueueMetrics] = useState(() => printQueueManager.getQueueMetricsForToken());

  useEffect(() => {
    const unsub = printQueueManager.subscribe(() => {
      setQueueMetrics(printQueueManager.getQueueMetricsForToken());
    });
    return unsub;
  }, []);
  const [failErrorMessage, setFailErrorMessage] = useState("");
  const [isDocDetailsOpen, setIsDocDetailsOpen] = useState(false);
  const [isBillBreakdownOpen, setIsBillBreakdownOpen] = useState(false);
  const isSubmittingRef = useRef(false);
  const paymentTimerRef = useRef<number | null>(null);

  const rawTotalPages = uploadedFiles.length > 0
    ? uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0)
    : job.pages;

  const parsedCustomRange = job.pageRangeMode === "custom" && job.pageRange
    ? parsePageRangeInput(job.pageRange, rawTotalPages)
    : { valid: true, pages: [] };

  const effectivePages = job.pageRangeMode === "current"
    ? 1
    : job.pageRangeMode === "custom" && parsedCustomRange.valid && parsedCustomRange.pages.length > 0
    ? parsedCustomRange.pages.length
    : rawTotalPages;

  const totalPages = effectivePages;
  const pagesPerSheet = Math.max(1, job.pagesPerSheet || 1);
  const printableSides = Math.ceil(effectivePages / pagesPerSheet);

  const effectiveUploadedFiles = uploadedFiles.length > 0
    ? uploadedFiles
    : [{ name: job.fileName || "Document.pdf", pages: job.pages || 1, size: job.fileSize || "1.2 MB", type: "application/pdf", url: "" }];

  const fileCalculations = effectiveUploadedFiles.map((file) => {
    const fPages = Math.max(1, file.pages || 1);
    const fPaperStock = normalizePaperStock(job.paperStock);
    const fPaperSize = job.paper || "A4";
    const fIsSingle = job.singleSided || !isDoubleSidedAvailable(fPaperStock);
    const fPricePerSheet = getPricePerSheet(fPaperStock, fPaperSize, fIsSingle, job.colour);
    const fCopies = Math.max(1, job.copies || 1);
    const fTotalSheets = fPages * fCopies;
    const fSubtotal = fPricePerSheet * fTotalSheets;
    return {
      name: file.name,
      pages: fPages,
      copies: fCopies,
      paperStock: fPaperStock,
      paperSize: fPaperSize,
      isSingle: fIsSingle,
      colour: Boolean(job.colour),
      pricePerSheet: fPricePerSheet,
      totalSheets: fTotalSheets,
      subtotal: fSubtotal,
    };
  });

  const totalSheetsAllFiles = fileCalculations.reduce((sum, item) => sum + item.totalSheets, 0);
  const grandTotal = fileCalculations.reduce((sum, item) => sum + item.subtotal, 0);

  const checkoutEstimate = calculateEstimatedReadyTime({
    pages: rawTotalPages,
    copies: job.copies,
    colour: job.colour,
    singleSided: job.singleSided,
    paper: job.paper,
    paperStock: job.paperStock,
  });
  const startPayment = (shouldFail = false) => {
    // Prevent repeated payment requests if user taps multiple times
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const token = generateUniquePickupToken();
    setAssignedToken(token);
    setPaymentState("processing");
    setProcessStatus("processing");
    setPaymentProgress(0);
    setFailErrorMessage("");
    setIsProcessingModalOpen(true);

    const startedAt = Date.now();
    const duration = 1000;

    if (paymentTimerRef.current !== null) window.clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setPaymentProgress(progress);

      if (progress >= 100) {
        if (paymentTimerRef.current !== null) window.clearInterval(paymentTimerRef.current);

        if (shouldFail) {
          isSubmittingRef.current = false;
          setPaymentState("idle");
          setProcessStatus("failed");
          setFailErrorMessage("Payment authorization failed by your bank. Please check your UPI balance or try another method.");
        } else {
          setProcessStatus("success");
          setPaymentState("success");
          onOrderConfirmed(token);
          window.setTimeout(() => {
            isSubmittingRef.current = false;
            setIsProcessingModalOpen(false);
            go("paymentSuccess");
          }, 800);
        }
      }
    }, 50);
  };

  const handleCancelPayment = () => {
    if (paymentTimerRef.current !== null) window.clearInterval(paymentTimerRef.current);
    isSubmittingRef.current = false;
    setIsProcessingModalOpen(false);
    setProcessStatus("idle");
    setPaymentState("idle");
    setPaymentProgress(0);
  };

  const handleRetryPayment = () => {
    isSubmittingRef.current = false;
    startPayment(false);
  };

  return (
    <main className="bill-review-page" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="bill-header-nav">
        <button
          type="button"
          className="bill-back-button"
          onClick={() => go("setup")}
          aria-label="Back to Print Settings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="bill-header-title">Review & Pay</h1>
      </div>

      <div className="bill-shop-notice">
        <span className="bill-shop-dot" />
        <span>Campus Central Shop · Open 9:30 AM – 5:00 PM (Mon–Fri)</span>
      </div>

      {/* 1. Payment Method Selector (near top) */}
      <div className="bill-payment-selector">
        <label className="bill-card-title" style={{ margin: "4px 0 8px" }}>Payment Method</label>
        <div
          className={`bill-pay-opt${payment === "UPI" ? " is-selected" : ""}`}
          onClick={() => paymentState === "idle" && setPayment("UPI")}
          role="button"
          tabIndex={0}
        >
          <div className="bill-pay-opt-info">
            <div className="bill-pay-opt-radio" />
            <div className="bill-pay-opt-text">
              <strong>Pay via UPI / QR</strong>
              <small>Google Pay, PhonePe, Paytm, BHIM</small>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>Instant</span>
        </div>

        <div
          className={`bill-pay-opt${payment === "Cash" ? " is-selected" : ""}`}
          onClick={() => paymentState === "idle" && setPayment("Cash")}
          role="button"
          tabIndex={0}
        >
          <div className="bill-pay-opt-info">
            <div className="bill-pay-opt-radio" />
            <div className="bill-pay-opt-text">
              <strong>Pay Cash at Counter</strong>
              <small>Pay ₹{grandTotal.toFixed(2)} when collecting prints</small>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>At pickup</span>
        </div>
      </div>

      {/* BATCH 4: Group Cost Settlement */}
      <GroupCostSettlement
        grandTotal={grandTotal}
        totalPages={totalPages}
        pricePerSheet={fileCalculations[0]?.pricePerSheet || 2}
      />

      {/* 1. Bill Breakdown Accordion */}
      <section className="bill-card" aria-labelledby="bill-breakdown-heading" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="accordion-header-btn"
          onClick={() => setIsBillBreakdownOpen(!isBillBreakdownOpen)}
          aria-expanded={isBillBreakdownOpen}
          aria-controls="bill-breakdown-content"
          id="bill-breakdown-heading"
        >
          <div className="accordion-header-left">
            <span className="accordion-title-text">Bill Breakdown</span>
            <span className="accordion-badge">₹{grandTotal.toFixed(2)}</span>
          </div>
          <div className="accordion-header-right">
            <span className={`accordion-chevron${isBillBreakdownOpen ? " is-expanded" : ""}`} aria-hidden="true">
              ▼
            </span>
          </div>
        </button>

        <div
          id="bill-breakdown-content"
          className={`accordion-panel${isBillBreakdownOpen ? " is-open" : ""}`}
          role="region"
          aria-labelledby="bill-breakdown-heading"
        >
          <div className="accordion-panel-inner">
            <div className="bill-line-rows">
              {fileCalculations.map((file, idx) => (
                <div key={idx} className="bill-file-breakdown-block">
                  <div className="bill-line-row file-name-row">
                    <strong style={{ color: "var(--text)", fontSize: 13 }}>{file.name}</strong>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>₹{file.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="bill-line-row file-detail-row">
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      ₹{file.pricePerSheet.toFixed(2)} / sheet × {file.totalSheets} {file.totalSheets === 1 ? "sheet" : "sheets"} ({file.pages} {file.pages === 1 ? "pg" : "pgs"} × {file.copies} {file.copies > 1 ? "copies" : "copy"})
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {file.paperStock} · {file.paperSize} · {file.isSingle ? "Single" : "Double"}
                    </span>
                  </div>
                </div>
              ))}

              <div className="bill-divider-line" />

              <div className="bill-line-row">
                <span>Total Sheets (All Files)</span>
                <span>{totalSheetsAllFiles} {totalSheetsAllFiles === 1 ? "sheet" : "sheets"}</span>
              </div>
              <div className="bill-line-row">
                <span>Handling & Desk Sorting</span>
                <span style={{ color: "var(--status-ready)" }}>FREE (₹0.00)</span>
              </div>
              <div className="bill-line-row total-row">
                <span>Grand Total</span>
                <span className="bill-total-price">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Document Details Accordion */}
      <section className="bill-card" aria-labelledby="bill-details-heading" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="accordion-header-btn"
          onClick={() => setIsDocDetailsOpen(!isDocDetailsOpen)}
          aria-expanded={isDocDetailsOpen}
          aria-controls="doc-details-content"
          id="bill-details-heading"
        >
          <div className="accordion-header-left">
            <span className="accordion-title-text">Document Details</span>
            <span className="accordion-badge" style={{ color: "var(--text-secondary)" }}>
              {effectiveUploadedFiles.length} {effectiveUploadedFiles.length === 1 ? "file" : "files"}
            </span>
          </div>
          <div className="accordion-header-right">
            <span className={`accordion-chevron${isDocDetailsOpen ? " is-expanded" : ""}`} aria-hidden="true">
              ▼
            </span>
          </div>
        </button>

        <div
          id="doc-details-content"
          className={`accordion-panel${isDocDetailsOpen ? " is-open" : ""}`}
          role="region"
          aria-labelledby="bill-details-heading"
        >
          <div className="accordion-panel-inner">
            <div className="bill-doc-details-files">
              {fileCalculations.map((file, idx) => (
                <div key={idx} className="doc-details-file-card">
                  <div className="doc-details-file-header">
                    <strong className="doc-details-file-title" title={file.name}>{file.name}</strong>
                    <span className="doc-details-file-pages">{file.pages} {file.pages === 1 ? "page" : "pages"}</span>
                  </div>
                  <div className="doc-details-grid">
                    <div className="doc-detail-cell">
                      <span className="doc-detail-lbl">Copies</span>
                      <span className="doc-detail-val">{file.copies} {file.copies === 1 ? "copy" : "copies"}</span>
                    </div>
                    <div className="doc-detail-cell">
                      <span className="doc-detail-lbl">Paper Type</span>
                      <span className="doc-detail-val">{file.paperStock}</span>
                    </div>
                    <div className="doc-detail-cell">
                      <span className="doc-detail-lbl">Paper Size</span>
                      <span className="doc-detail-val">{file.paperSize}</span>
                    </div>
                    <div className="doc-detail-cell">
                      <span className="doc-detail-lbl">Print Side</span>
                      <span className="doc-detail-val">{file.isSingle ? "Single-Sided" : "Double-Sided"}</span>
                    </div>
                    <div className="doc-detail-cell">
                      <span className="doc-detail-lbl">Colour Mode</span>
                      <span className="doc-detail-val">{file.colour ? "Full Colour" : "Black & White"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {job.specialInstructions && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(244, 215, 121, 0.06)", borderRadius: 8, fontSize: 12, border: "1px dashed rgba(244, 215, 121, 0.25)" }}>
                <strong style={{ color: "var(--accent)" }}>Special Instructions: </strong>
                <span style={{ color: "var(--text-secondary)" }}>{job.specialInstructions}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Live Print Queue Status */}
      <section className="bill-card" aria-labelledby="bill-queue-heading" style={{ marginBottom: 20 }}>
        <div className="bill-card-title">
          <span id="bill-queue-heading">Live Print Queue Status</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
            {queueMetrics.isPrinterActive ? "Printer Active (FIFO)" : "Printer Idle"}
          </span>
        </div>
        <div className="bill-line-rows">
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Currently Printing</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {queueMetrics.currentlyPrinting ? `Token ${queueMetrics.currentlyPrinting.token}` : "None (Printer Ready)"}
            </span>
          </div>
          {queueMetrics.currentlyPrinting && (
            <div className="bill-line-row">
              <span style={{ color: "var(--text-secondary)" }}>Current Order Details</span>
              <span style={{ color: "var(--text)", fontSize: 12 }}>
                {queueMetrics.currentlyPrinting.fileName} ({queueMetrics.currentlyPrinting.details})
              </span>
            </div>
          )}
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Your Token (Upon Confirmation)</span>
            <span style={{ color: "var(--text)", fontWeight: 700 }}>Next Available</span>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Orders Ahead of You</span>
            <span style={{ color: "var(--text)" }}>{queueMetrics.ordersAhead} {queueMetrics.ordersAhead === 1 ? "order" : "orders"}</span>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Estimated Waiting Time</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{queueMetrics.waitFormatted}</span>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Current Order Progress</span>
            <span style={{ color: "var(--status-ready)", fontWeight: 600 }}>Ready to Queue</span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", margin: "10px 0 0", lineHeight: 1.5 }}>
          Estimated wait calculated dynamically based on queue depth & page volume. Not a guaranteed time.
        </p>
      </section>

      {paymentState === "processing" && (
        <div style={{ padding: "16px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "inline-block", width: 28, height: 28, border: "3px solid rgba(244, 215, 121, 0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 10 }} />
          <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 14 }}>
            {payment === "UPI" ? "Processing UPI Payment…" : "Generating Shop Token…"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 10px" }}>
            Please wait, communicating with Campus Print Shop
          </div>
          <div className="upload-progress-track" style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
            <div className="upload-progress-fill" style={{ width: `${paymentProgress}%`, height: "100%", background: "var(--accent)", transition: "width 80ms linear" }} />
          </div>
        </div>
      )}

      {/* Fixed Sticky Bottom Pay Bar */}
      <div className="bill-fixed-bottom-bar" role="region" aria-label="Order payment action">
        <button
          type="button"
          className="bill-pay-btn"
          disabled={paymentState === "processing"}
          onClick={() => startPayment(false)}
        >
          {paymentState === "processing" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 16, height: 16, border: "2px solid rgba(10,10,10,0.3)", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              {payment === "UPI" ? "Processing UPI…" : "Generating Token…"}
            </span>
          ) : (
            payment === "UPI" ? `Pay ₹${grandTotal.toFixed(2)} & Place Order` : "Confirm & Pay at Counter"
          )}
        </button>
      </div>

      {/* Dedicated Animated Payment Processing & Resolution Modal */}
      <PaymentProcessingModal
        isOpen={isProcessingModalOpen}
        status={processStatus}
        progress={paymentProgress}
        totalAmount={`₹${grandTotal.toFixed(2)}`}
        assignedToken={assignedToken}
        errorMessage={failErrorMessage}
        onRetry={handleRetryPayment}
        onCancel={handleCancelPayment}
        onContinueToToken={() => {
          setIsProcessingModalOpen(false);
          go("paymentSuccess");
        }}
      />
    </main>
  );
}

function PaymentSuccess({
  go,
  order,
}: {
  go: (screen: Screen) => void;
  order: ActiveOrder | null;
}) {
  const estimate = order
    ? calculateEstimatedReadyTime({
        pages: order.job.pages,
        copies: order.job.copies,
        colour: order.job.colour,
        singleSided: order.job.singleSided,
        paper: order.job.paper,
        paperStock: order.job.paperStock,
      })
    : calculateEstimatedReadyTime({ pages: 1 });

  const token = order?.token || "K-47";
  const orderRef = order?.recordId ? `#PQ-${order.recordId.slice(-5).toUpperCase()}` : "#PQ-84920";

  const totalPages = order?.job ? order.job.pages : 1;
  const copies = order?.job ? order.job.copies : 1;
  const orderPricing = order?.job ? calculateJobPricing(order.job, 1) : null;
  const totalAmount = orderPricing ? orderPricing.grandTotal : 0;

  const [secondsLeft, setSecondsLeft] = useState(7);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);

  const cancelTimerAndNavigate = useCallback((destination: Screen) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    go(destination);
  }, [go]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = window.setTimeout(() => {
      cancelTimerAndNavigate("home");
    }, 7000);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [cancelTimerAndNavigate]);

  return (
    <main className="page payment-success-page" style={{ padding: "24px 16px calc(24px + env(safe-area-inset-bottom, 0px))", maxWidth: 420, margin: "0 auto" }}>
      <section className="payment-success-card" role="status" style={{ textAlign: "center" }}>
        <PaymentCelebrationIllustration />
        <div className="success-badge-circle" aria-hidden="true">
          ✓
        </div>
        <p className="payment-success-eyebrow" style={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--status-ready)", fontWeight: 700, fontSize: 12 }}>
          Order Confirmed
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "4px 0 8px" }}>
          Order Placed Successfully!
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.4, margin: "0 0 16px" }}>
          Your print job has been queued at Campus Central Print Shop.
        </p>

        {/* Token Card */}
        <div style={{ padding: "18px 16px", borderRadius: "18px", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "16px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
            Your Pickup Token
          </span>
          <strong style={{ fontSize: 44, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.06em", display: "block", lineHeight: 1, marginBottom: 8 }}>
            {token}
          </strong>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "4px 0 8px", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(244, 215, 121, 0.08)", borderRadius: 12, border: "1px solid rgba(244, 215, 121, 0.2)" }}>
            {readyEstimate.readyTimeFormatted && readyEstimate.readyTimeFormatted !== "--:--"
              ? `⏱ Ready around ${readyEstimate.readyTimeFormatted}`
              : `⏱ Ready in ~${readyEstimate.minutes || 15} minutes`}
          </div>
          <small style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Reference: {orderRef} · Show this token at counter
          </small>
        </div>

        {/* Total Amount Paid */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "14px" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Paid</span>
          <strong style={{ fontSize: 16, color: "var(--accent)", fontWeight: 800 }}>₹{totalAmount.toFixed(2)}</strong>
        </div>

        {/* Estimated completion banner */}
        <div style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", textAlign: "left" }}>
          <div>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Estimated Ready</span>
            <strong style={{ fontSize: 14, color: "var(--text)" }}>{estimate.primaryText}</strong>
          </div>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{estimate.subText}</span>
        </div>

        {/* Countdown Indicator */}
        <div style={{ margin: "14px 0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span>Auto-returning to Home</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{secondsLeft}s</span>
          </div>
          <div className="success-countdown-track">
            <div className="success-countdown-bar" style={{ width: `${(secondsLeft / 7) * 100}%` }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            className="bill-pay-btn"
            onClick={() => cancelTimerAndNavigate("token")}
          >
            Track Order Status →
          </button>
          <button
            type="button"
            className="track-action-btn"
            onClick={() => cancelTimerAndNavigate("home")}
          >
            Back to Home
          </button>
        </div>
      </section>
    </main>
  );
}

function Token({
  go,
  order,
  onCancelOrder,
  onSetStage,
}: {
  go: (screen: Screen) => void;
  order: ActiveOrder | null;
  onCancelOrder: () => boolean;
  onSetStage?: (status: ActiveOrder["status"]) => void;
}) {
  const [queueMetrics, setQueueMetrics] = useState(() => printQueueManager.getQueueMetricsForToken(order?.token));

  useEffect(() => {
    const unsub = printQueueManager.subscribe(() => {
      setQueueMetrics(printQueueManager.getQueueMetricsForToken(order?.token));
    });
    return unsub;
  }, [order?.token]);

  if (!order) {
    return (
      <main className="page" style={{ padding: "40px 16px", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
        <NoActiveOrderIllustration />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "4px 0 6px" }}>No Active Order</h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 20px", fontSize: 13.5 }}>You do not have an active print order right now.</p>
        <button type="button" className="bill-pay-btn" onClick={() => go("home")}>Go to Home</button>
      </main>
    );
  }

  const job = order.job;
  const [substitutionRequest, setSubstitutionRequest] = useState<MaterialSubstitutionAlert | null>(() => {
    // Check if operator marked this paper out-of-stock
    if (job.paperStock && /glossy|premium photo/i.test(job.paperStock)) {
      return {
        originalMaterial: job.paperStock,
        substituteMaterial: "Matte Heavyweight (170 GSM)",
        priceDifference: 0,
        revisedMinutes: 12,
        reason: "Glossy paper roll depleted; operator offers Matte Heavyweight.",
      };
    }
    return null;
  });

  const readyEstimate = calculateEstimatedReadyTime({
    pages: job.pages,
    copies: job.copies,
    colour: job.colour,
    singleSided: job.singleSided,
    paper: job.paper,
    paperStock: job.paperStock,
    queueStatus: queueMetrics.queueStatus || 'normal',
    queueAvailable: queueMetrics.isAvailable !== false,
  });
  const etaText = (queueMetrics.isAvailable !== false && readyEstimate.readyTimeFormatted && readyEstimate.readyTimeFormatted !== '--:--')
    ? `⏱ Ready around ${readyEstimate.readyTimeFormatted}`
    : `⏱ Ready in ~${readyEstimate.minutes || 15} minutes`;
  const isCancelled = order.status === "cancelled";

  // Derive order status directly from shared FIFO Queue Engine
  const queueStatus = queueMetrics.userOrderStatus || (isCancelled ? "cancelled" : "waiting");
  
  // Map queue status to ActiveOrder status stages:
  // "waiting" -> "queued", "printing" -> "printing", "ready" -> "ready", "completed" -> "completed"
  const mappedStatus: ActiveOrder["status"] = isCancelled
    ? "cancelled"
    : queueStatus === "waiting"
    ? "queued"
    : queueStatus === "printing"
    ? "printing"
    : queueStatus === "ready"
    ? "ready"
    : queueStatus === "completed"
    ? "completed"
    : "queued";

  // Automatically sync to parent state if updated in queue
  useEffect(() => {
    if (!isCancelled && onSetStage && order.status !== mappedStatus) {
      onSetStage(mappedStatus);
    }
  }, [mappedStatus, isCancelled, onSetStage, order.status]);

  const stageKeys: ActiveOrder["status"][] = ["confirmed", "queued", "printing", "ready", "completed"];
  const currentStageIndex = isCancelled ? -1 : stageKeys.indexOf(mappedStatus);

  const isCompleted = mappedStatus === "completed";
  const isReady = mappedStatus === "ready";
  const isPrinting = mappedStatus === "printing";
  const canCancel = !isCancelled && currentStageIndex <= 1;

  const stages: { key: string; title: string; desc: React.ReactNode }[] = [
    {
      key: "confirmed",
      title: "Order Confirmed",
      desc: "Order verified & payment confirmed",
    },
    {
      key: "queued",
      title: "Queued (FIFO)",
      desc: queueMetrics.ordersAhead > 0
        ? `${queueMetrics.ordersAhead} ${queueMetrics.ordersAhead === 1 ? "order" : "orders"} ahead of you in queue`
        : "Next in line to print",
    },
    {
      key: "printing",
      title: "Printing",
      desc: (
        <span>
          Printing {job.pages} pages × {job.copies} {job.copies > 1 ? "copies" : "copy"} ({job.colour ? "Colour" : "B&W"})
          {isPrinting && (
            <span className="track-printing-indicator" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span className="printing-dot-wave">
                <span /><span /><span />
              </span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Printing on Printer #1...</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: "ready",
      title: "Ready for Pickup",
      desc: "Available at Campus Central Counter / Shelf A-2",
    },
    {
      key: "completed",
      title: "Completed",
      desc: "Order collected & verified from counter",
    },
  ];

  return (
    <main className="studio page" style={{ maxWidth: 420, margin: "0 auto", padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Top Header */}
      <div className="bill-header-nav" style={{ marginBottom: 14 }}>
        <button type="button" className="bill-back-button" onClick={() => go("home")} aria-label="Back to Home">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="bill-header-title">Live Order & Queue Tracking</h1>
      </div>

      {/* Prominent Token Banner */}
      <div className="track-token-banner" style={{ marginBottom: 16 }}>
        <TrackingStatusIllustration stageIndex={currentStageIndex} />
        <span className="track-token-eyebrow">Pickup Token</span>
        <strong className="track-token-code">{order.token}</strong>
        <div className="token-estimated-ready-time" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "4px 0 8px", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(244, 215, 121, 0.08)", borderRadius: 12, border: "1px solid rgba(244, 215, 121, 0.2)" }}>
          {etaText}
        </div>
        <span className="track-token-sub">
          {job.fileName} · {job.pages} {job.pages === 1 ? "page" : "pages"} ({job.colour ? "Colour" : "B&W"})
        </span>
      </div>

      {/* BATCH 3: QR Pickup Token & Counter Verification */}
      <TokenQRDisplay
        token={order.token}
        orderRef={order.recordId}
        status={mappedStatus === "ready" ? "Ready for Pickup" : mappedStatus === "printing" ? "Printing" : mappedStatus === "completed" ? "Collected" : "Queued"}
      />

      {/* BATCH 3: Material Substitution Approval Modal */}
      {substitutionRequest && (
        <MaterialSubstitutionModal
          substitution={substitutionRequest}
          onApprove={() => {
            setSubstitutionRequest(null);
          }}
          onCancelOrder={() => {
            setSubstitutionRequest(null);
            onCancelOrder();
          }}
        />
      )}

      {/* Live Print Queue Status Section */}
      <section className="bill-card" aria-labelledby="token-queue-heading" style={{ marginBottom: 16 }}>
        <div className="bill-card-title">
          <span id="token-queue-heading">Live Print Queue</span>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
            FIFO Active
          </span>
        </div>
        <div className="bill-line-rows">
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Currently Printing</span>
            <strong style={{ color: "var(--accent)" }}>
              {queueMetrics.currentlyPrinting ? `Token ${queueMetrics.currentlyPrinting.token}` : "None (Idle)"}
            </strong>
          </div>
          {queueMetrics.currentlyPrinting && (
            <div className="bill-line-row">
              <span style={{ color: "var(--text-secondary)" }}>Current Order Details</span>
              <span style={{ color: "var(--text)", fontSize: 12 }}>
                {queueMetrics.currentlyPrinting.fileName} ({queueMetrics.currentlyPrinting.details})
              </span>
            </div>
          )}
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Your Token Number</span>
            <strong style={{ color: "var(--text)" }}>{order.token}</strong>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Orders Ahead of You</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {queueMetrics.ordersAhead} {queueMetrics.ordersAhead === 1 ? "order" : "orders"}
            </span>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Estimated Waiting Time</span>
            <strong style={{ color: isReady || isCompleted ? "var(--status-ready)" : "var(--accent)" }}>
              {isCompleted ? "Completed" : isReady ? "Ready Now!" : isPrinting ? "Printing now..." : queueMetrics.waitFormatted}
            </strong>
          </div>
          <div className="bill-line-row">
            <span style={{ color: "var(--text-secondary)" }}>Current Order Progress</span>
            <span style={{
              color: isCompleted || isReady ? "var(--status-ready)" : isPrinting ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 700,
              textTransform: "capitalize"
            }}>
              {isCancelled ? "Cancelled" : mappedStatus === "queued" ? "Waiting" : mappedStatus === "ready" ? "Ready for Collection" : mappedStatus}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", margin: "10px 0 0", lineHeight: 1.5 }}>
          Queue is shared and processed strictly in FIFO order. Waiting time is an estimate calculated from total pages and color settings.
        </p>
      </section>

      {/* Callout if Ready */}
      {isReady && (
        <div className="track-pickup-callout" role="alert" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <div>
            <strong>Ready for Collection Now!</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Collect your prints at Campus Central Counter with Token <strong>{order.token}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Callout if Completed */}
      {isCompleted && (
        <div className="track-pickup-callout" style={{ background: "rgba(167, 232, 189, 0.2)", borderColor: "var(--status-ready)", color: "var(--text)", marginBottom: 16 }}>
          <span style={{ fontSize: 20, color: "var(--status-ready)" }}>✓</span>
          <div>
            <strong style={{ color: "var(--status-ready)" }}>Order Completed!</strong>
            <div style={{ fontSize: 12, marginTop: 2, color: "var(--text-secondary)" }}>
              Your order has been collected from Campus Central Print Shop.
            </div>
          </div>
        </div>
      )}

      {/* Callout if Cancelled */}
      {isCancelled && (
        <div className="track-pickup-callout" style={{ background: "rgba(244, 63, 94, 0.12)", borderColor: "#F43F5E", color: "#F43F5E", marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>✕</span>
          <div>
            <strong>Order Cancelled</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>This print job was cancelled.</div>
          </div>
        </div>
      )}

      {/* 5-Stage Step Card */}
      <section className="track-stages-card" aria-label="5-Stage progress tracker">
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>
          Order Lifecycle
        </h2>

        {stages.map((stage, idx) => {
          const isDone = !isCancelled && idx < currentStageIndex;
          const isActive = !isCancelled && idx === currentStageIndex;

          return (
            <div key={stage.key} className="track-stage-row">
              <div className="track-stage-spine">
                <div
                  className={`track-stage-circle${isDone ? " is-done" : ""}${isActive ? " is-active" : ""}`}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                {idx < stages.length - 1 && (
                  <div className={`track-stage-line${idx < currentStageIndex && !isCancelled ? " is-done" : ""}`} />
                )}
              </div>
              <div className="track-stage-content">
                <h3 className={`track-stage-title${isActive ? " is-active" : ""}`}>
                  {stage.title}
                </h3>
                <div className="track-stage-desc">
                  {isCancelled ? "Order cancelled" : stage.desc}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Actions */}
      <div className="track-actions-bar" style={{ marginTop: 16 }}>
        {canCancel && !isCancelled && (
          <button
            type="button"
            className="track-action-btn"
            style={{ color: "#F43F5E", borderColor: "rgba(244, 63, 94, 0.3)" }}
            onClick={() => {
              if (window.confirm("Are you sure you want to cancel this print order?")) {
                onCancelOrder();
                try {
                  printQueueManager.updateOrderStatus(order.recordId, "cancelled");
                } catch {}
              }
            }}
          >
            Cancel Order
          </button>
        )}
        <button
          type="button"
          className="bill-pay-btn"
          style={{ width: "100%" }}
          onClick={() => go("home")}
        >
          Back to Home
        </button>
      </div>
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

function History({ go, records }: { go: (screen: Screen) => void; records: PrintHistoryRecord[] }) {
  const sortedRecords = [...records].sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
  return (
    <main className="page list-page">
      <AppHeader title="Old Documents" onBack={() => go("profile")} />
      <section className="history-list">
        {sortedRecords.length === 0 ? <p className="history-empty">No old documents found.</p> : sortedRecords.map((record) => (
          <article className="history-card old-document-card" key={record.id}>
            <b>{record.job.fileName}</b><strong>{record.status === "pickup" ? "Completed" : orderStatusLabels[record.status]}</strong>
            {record.isDemo && <em className="demo-data-label">Demo data</em>}
            <p>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(record.submittedAt))}</p>
            <p>{record.job.pages} {record.job.pages === 1 ? "page" : "pages"} / {record.job.colour ? "Colour" : "B&W"}</p>
          </article>
        ))}
      </section>
      <BottomNavigation active="history" onHome={() => go("home")} onHistory={() => go("history")} onNotifications={() => go("notifications")} onProfile={() => go("profile")} />
    </main>
  );
}

function Profile({
  go,
  profile,
  hasDemoData,
  onClearDemoData,
  onDeleteAllData,
}: {
  go: (screen: Screen) => void;
  profile: ProfileDetails;
  hasDemoData: boolean;
  onClearDemoData: () => void;
  onDeleteAllData: () => Promise<boolean>;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const confirmDelete = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setDeleteError("");
    if (!await onDeleteAllData()) setDeleteError("Could not clear all browser data. Please try again.");
  };
  return (
    <main className="page account-page">
      <AppHeader title="Profile" onBack={() => go("home")} />
      <section className="profile-summary">
        <span><img src={profile.photo} alt="Profile photo" /></span>
        <div><h2>{profile.name}</h2><p>{profile.phone}</p><p>{profile.email}</p><small>Campus Print Member</small></div>
      </section>
      <section className="account-menu" aria-label="Profile options">
        <MenuRow icon="edit-profile" title="Edit Profile" detail="Update your name, contact details, and photo" onClick={() => go("editProfile")} />
        <MenuRow icon="29341.svg" title="Old Documents" detail="View your past print orders and documents" onClick={() => go("history")} />
        {hasDemoData && <MenuRow icon="986ce.svg" title="Clear Demo Data" detail="Remove sample orders and keep real orders" onClick={onClearDemoData} danger />}
        <MenuRow icon="6aaa0.svg" title="Settings" detail="Printing preferences and app settings" onClick={() => go("settings")} />
        <MenuRow icon="0bcda.svg" title="Help & Support" detail="FAQs and contact information" onClick={() => go("help")} />
        <MenuRow icon="logout" title="Sign Out" onClick={() => go("login")} danger />
      </section>
      <button className="delete-all-data-button" type="button" onClick={() => { setDeleteConfirmation(""); setDeleteError(""); setShowDeleteDialog(true); }}>
        <Asset name="trash" />Delete All Data
      </button>
      <BottomNavigation active="profile" onHome={() => go("home")} onHistory={() => go("history")} onNotifications={() => go("notifications")} onProfile={() => go("profile")} />
      {showDeleteDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDeleteDialog(false); }}>
          <section className="cancel-order-dialog delete-data-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-data-title" aria-describedby="delete-data-copy">
            <h2 id="delete-data-title">Delete All Data</h2>
            <p id="delete-data-copy">All your data will be permanently deleted. Type DELETE to confirm.</p>
            <label htmlFor="delete-data-confirmation">Confirmation</label>
            <input id="delete-data-confirmation" autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
            {deleteError && <p className="delete-data-error" role="alert">{deleteError}</p>}
            <div className="cancel-order-dialog-actions">
              <button type="button" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button type="button" className="danger" disabled={deleteConfirmation !== "DELETE"} onClick={confirmDelete}>Delete All Data</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function EditProfile({ go, profile, onSave }: { go: (screen: Screen) => void; profile: ProfileDetails; onSave: (next: ProfileDetails) => void }) {
  const [draft, setDraft] = useState(profile);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file for your profile photo.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setPhotoError("This photo could not be loaded. Try a different image.");
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => setPhotoError("This photo could not be loaded. Try a different image.");
      image.onload = () => {
        const maxDimension = 512;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setPhotoError("This photo could not be prepared. Try a different image.");
          return;
        }
        context.fillStyle = "var(--text-secondary)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setDraft((current) => ({ ...current, photo: canvas.toDataURL("image/jpeg", 0.82) }));
        setPhotoError("");
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  return (
    <main className="page account-page">
      <AppHeader title="Edit Profile" onBack={() => go("profile")} />
      <form className="edit-profile-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); go("profile"); }}>
        <div className="edit-profile-photo">
          <img src={draft.photo} alt="Profile preview" />
          <button type="button" className="photo-change-button" onClick={() => photoInput.current?.click()}>Change photo</button>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={(event) => choosePhoto(event.target.files?.[0])} />
        </div>
        {photoError && <p className="profile-form-error" role="alert">{photoError}</p>}
        <label>Name<input required autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Phone number<input required type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
        <label>Email<input required type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
        <div className="edit-profile-actions">
          <button type="button" className="profile-cancel-button" onClick={() => go("profile")}>Cancel</button>
          <button type="submit" className="profile-save-button">Save Changes</button>
        </div>
      </form>
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
        <div><b>Campus Print Shop</b><p>Campus Central Building</p><small>Open Monday–Friday, 9:30 AM–5:00 PM</small></div>
      </section>
    </main>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "PrintQ | Campus Print Ordering and Notifications";
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.append(themeColor);
    }
    const backgroundToken = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    if (backgroundToken) themeColor.content = backgroundToken;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content = "PrintQ campus print ordering with print status and ready notifications.";
  }, []);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginSummary, setLoginSummary] = useState<LoginSummary | null>(null);
  const [homeFile, setHomeFile] = useState<File | null>(null);
  const [paySheetStep, setPaySheetStep] = useState<"details" | "otp" | "remembered" | "pay" | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<"Online UPI" | "Print Wallet" | "Cash at Counter" | "UPI at Counter" | null>(null);
  const [rememberedPayUser, setRememberedPayUser] = useState<RememberedPayUser | null>(readRememberedPayUser);
  const [payName, setPayName] = useState("");
  const [payMobile, setPayMobile] = useState("");
  const [detailsAttempted, setDetailsAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(false);
  const homeFileInput = useRef<HTMLInputElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  const payNameInput = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const closeSheetButton = useRef<HTMLButtonElement>(null);
  const verifyTimeout = useRef<number | null>(null);
  const mobileIsValid = /^\d{10}$/.test(payMobile);
  const nameErrorVisible = (detailsAttempted || nameTouched) && !payName.trim();
  const mobileErrorVisible = (detailsAttempted || mobileTouched) && !mobileIsValid;

  const closePaySheet = () => {
    if (verifyTimeout.current !== null) window.clearTimeout(verifyTimeout.current);
    verifyTimeout.current = null;
    setPaySheetStep(null);
    setIsVerifyingOtp(false);
    window.setTimeout(() => payButtonRef.current?.focus(), 0);
  };
  const openPaySheet = () => {
    setSelectedPayMethod(null);
    setPaySheetStep(rememberedPayUser ? "remembered" : "details");
    setDetailsAttempted(false);
  };
  const submitPayDetails = () => {
    setDetailsAttempted(true);
    if (!payName.trim() || !mobileIsValid) return;
    setOtpDigits(["", "", "", ""]);
    setResendSeconds(30);
    setPaySheetStep("otp");
  };
  const verifyPayOtp = async () => {
    if (otpDigits.join("").length !== 4 || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    await new Promise<void>((resolve) => {
      verifyTimeout.current = window.setTimeout(() => {
        verifyTimeout.current = null;
        resolve();
      }, 1000);
    });
    const user = { name: payName.trim(), mobile: payMobile };
    try { window.localStorage.setItem(rememberedPayUserKey, JSON.stringify(user)); } catch { /* Keep the user remembered for this session. */ }
    setRememberedPayUser(user);
    setIsVerifyingOtp(false);
    setPaySheetStep("pay");
  };
  const choosePayMethod = () => {
    closePaySheet();
    setPaymentNotice(true);
  };

  useEffect(() => {
    if (!paySheetStep) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePaySheet();
        return;
      }
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>("[role='dialog']");
        const focusable = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [paySheetStep]);
  useEffect(() => {
    if (paySheetStep === "details") payNameInput.current?.focus();
    if (paySheetStep === "otp") otpInputRefs.current[0]?.focus();
    if (paySheetStep === "remembered" || paySheetStep === "pay") closeSheetButton.current?.focus();
  }, [paySheetStep]);
  useEffect(() => {
    if (paySheetStep !== "otp" || resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [paySheetStep, resendSeconds]);

  const [screen, setScreen] = useState<Screen>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>(() => getStoredLanguage());
  const [nowServing, setNowServing] = useState(() => printQueueManager.getNowServing());

  useEffect(() => {
    saveStoredLanguage(language);
  }, [language]);

  useEffect(() => {
    const unsub = printQueueManager.subscribe(() => {
      setNowServing(printQueueManager.getNowServing());
    });
    return unsub;
  }, []);
  const [headerPanel, setHeaderPanel] = useState<"search" | "notifications" | null>(null);
  const [authSession, setAuthSession] = useState<AuthUser | null>(() => readStoredAuthSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("onboardingCompleted") === "show";
    } catch {
      return false;
    }
  });
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(() => {
    const session = readStoredAuthSession();
    if (!session) return null;
    securityEngine.setAuthenticatedUser(session.id);
    const userOrders = securityEngine.getOrdersForCurrentUser();
    const active = userOrders.find((o) => o.status !== "completed" && o.status !== "cancelled");
    if (active) {
      return {
        recordId: active.id,
        token: active.token,
        job: active.job as PrintJob,
        status: active.status,
        createdAt: active.createdAt,
      };
    }
    return null;
  });
  const [profile, setProfile] = useState<ProfileDetails>(() => {
    const session = readStoredAuthSession();
    if (session) {
      return {
        name: session.name,
        email: session.email,
        phone: session.phone || "",
        photo: session.photo || demoProfile.photo,
      };
    }
    return emptyProfile;
  });
  const [printHistory, setPrintHistory] = useState<PrintHistoryRecord[]>(() => {
    const session = readStoredAuthSession();
    if (!session) return [];
    securityEngine.setAuthenticatedUser(session.id);
    const userOrders = securityEngine.getOrdersForCurrentUser();
    if (userOrders.length > 0) {
      return userOrders.map((o) => ({
        id: o.id,
        token: o.token,
        job: o.job as PrintJob,
        submittedAt: new Date(o.createdAt).toISOString(),
        status: o.status,
        createdAt: o.createdAt,
      }));
    }
    return [];
  });
  const [notificationItems, setNotificationItems] = useState<AppNotification[]>(() => {
    const session = readStoredAuthSession();
    if (!session) return [];
    securityEngine.setAuthenticatedUser(session.id);
    const userNotifs = securityEngine.getNotificationsForCurrentUser();
    if (userNotifs.length > 0) {
      return userNotifs.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        orderToken: n.orderToken,
        recordId: n.recordId,
        read: n.read,
        iconType: n.iconType as any,
      }));
    }
    return [];
  });
  const visibleNotificationCount = Math.min(notificationItems.length, 3);
  const [showPreview, setShowPreview] = useState(false);
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false);
  const [showPreviewComparison, setShowPreviewComparison] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<"original" | "updated">("original");
  const [printJob, setPrintJob] = useState<PrintJob>(() => ({
    ...defaultPrintJob,
    ...readStoredValue<SavedPrintSettings>(printSettingsStorageKey, {
      colour: false,
      singleSided: false,
      paper: "A4",
      copies: 1,
      pageRange: "",
      pageRangeMode: "all",
      pagesPerSheet: 1,
      orientation: "Portrait",
      noteToShop: "",
    }),
  }));
  const [originalPrintJob, setOriginalPrintJob] = useState<PrintJob>({ ...defaultPrintJob });
  const [filePreview, setFilePreview] = useState<FilePreviewData>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [hasDocument, setHasDocument] = useState(false);
  const [uploadReady, setUploadReady] = useState(false);
  const [homeStatusMessage, setHomeStatusMessage] = useState("");
  const [pendingHomeFiles, setPendingHomeFiles] = useState<File[]>([]);
  const pendingHomePreset = useRef<PrintJob>(defaultPrintJob);
  const [notifyOrderReady, setNotifyOrderReady] = useState(() => readStoredValue("printq_notify_order_ready", true));
  const [notifyShopClosing, setNotifyShopClosing] = useState(() => readStoredValue("printq_notify_shop_closing", true));
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredValue("printq_sound_enabled", true));
  const [autoOpenSettings, setAutoOpenSettings] = useState(() => readStoredValue("printq_auto_open_settings", true));
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem("printq_notify_order_ready", JSON.stringify(notifyOrderReady)); } catch {}
  }, [notifyOrderReady]);
  useEffect(() => {
    try { window.localStorage.setItem("printq_notify_shop_closing", JSON.stringify(notifyShopClosing)); } catch {}
  }, [notifyShopClosing]);
  useEffect(() => {
    try { window.localStorage.setItem("printq_sound_enabled", JSON.stringify(soundEnabled)); } catch {}
  }, [soundEnabled]);
  useEffect(() => {
    try { window.localStorage.setItem("printq_auto_open_settings", JSON.stringify(autoOpenSettings)); } catch {}
  }, [autoOpenSettings]);
  useEffect(() => {
    if (authSession) {
      securityEngine.setAuthenticatedUser(authSession.id);
      setProfile({
        name: authSession.name,
        email: authSession.email,
        phone: authSession.phone || "",
        photo: authSession.photo || demoProfile.photo,
      });
    } else {
      securityEngine.setAuthenticatedUser(null);
      setProfile(emptyProfile);
    }
  }, [authSession]);
  const confirmOrder = useCallback((assignedToken?: string) => {
    const recordId = createRecordId();
    const existingTokens = printHistory.map((r) => r.token);
    const token = assignedToken || generateUniquePickupToken(existingTokens);
    const job = { ...printJob };
    const createdAt = Date.now();
    const newOrder: ActiveOrder = { recordId, token, job, status: "confirmed", createdAt };
    setActiveOrder(newOrder);
    try {
      const qTotalPages = uploadedFiles.length > 0 ? uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0) : (job.pages || 1);
      printQueueManager.addOrder({
        id: recordId,
        token: token,
        fileName: job.fileName || "Document.pdf",
        totalPages: qTotalPages,
        copies: job.copies || 1,
        colour: Boolean(job.colour),
        paperStock: job.paperStock || "Regular",
        userEmail: authSession?.email,
        userName: authSession?.name,
      });
    } catch {}
    setPrintHistory((records) => [{ id: recordId, token, job, submittedAt: new Date().toISOString(), status: "confirmed", createdAt }, ...records]);
    setHasDocument(false);
    setUploadedFiles([]);

    // Add Order Placed & Payment Confirmed Notification
    const notif: PrintOrderNotification = {
      id: `order-placed-${recordId}`,
      type: "order_placed",
      title: "Order Placed & Payment Confirmed",
      message: `Your print order for "${job.fileName}" has been placed successfully with Pickup Token ${token}.`,
      timestamp: createdAt,
      orderToken: token,
      recordId: recordId,
      read: false,
      iconType: "payment",
    };
    setNotificationItems((items) => [notif, ...items.filter((it) => it.id !== notif.id)]);

    try {
      const pricing = calculateJobPricing(job, 1);
      const amount = pricing.grandTotal;
      securityEngine.createOrder({
        userEmail: authSession?.email || "vipul.khunti@gmail.com",
        userName: authSession?.name || "Vipul Khunti",
        token,
        status: "confirmed",
        job: { ...job },
        totalAmount: amount,
      });
    } catch {}

    return newOrder;
  }, [printJob, printHistory, setHasDocument, setUploadedFiles]);

  const createStageNotification = useCallback((order: ActiveOrder, nextStatus: ActiveOrder["status"]): PrintOrderNotification | null => {
    const id = `order-${nextStatus}-${order.recordId}`;
    if (nextStatus === "queued") {
      return {
        id,
        type: "queued",
        title: "Order Queued",
        message: `Your order #${order.token} has been added to the printing queue at Campus Central.`,
        timestamp: Date.now(),
        orderToken: order.token,
        recordId: order.recordId,
        read: false,
        iconType: "queue",
      };
    }
    if (nextStatus === "printing") {
      return {
        id,
        type: "printing",
        title: "Printing Started",
        message: `Your documents (${order.job.fileName}) are now being printed on Printer #2.`,
        timestamp: Date.now(),
        orderToken: order.token,
        recordId: order.recordId,
        read: false,
        iconType: "printing",
      };
    }
    if (nextStatus === "ready") {
      return {
        id,
        type: "ready",
        title: "Ready for Pickup",
        message: `Your print order #${order.token} is ready to collect at Campus Central Counter / Shelf A-2.`,
        timestamp: Date.now(),
        orderToken: order.token,
        recordId: order.recordId,
        read: false,
        iconType: "ready",
      };
    }
    if (nextStatus === "completed") {
      return {
        id,
        type: "completed",
        title: "Order Collected",
        message: `Order #${order.token} (${order.job.fileName}) was collected and marked complete.`,
        timestamp: Date.now(),
        orderToken: order.token,
        recordId: order.recordId,
        read: false,
        iconType: "completed",
      };
    }
    if (nextStatus === "cancelled") {
      return {
        id,
        type: "cancelled",
        title: "Order Cancelled",
        message: `Your print order for ${order.job.fileName} (Token ${order.token}) was cancelled.`,
        timestamp: Date.now(),
        orderToken: order.token,
        recordId: order.recordId,
        read: false,
        iconType: "cancelled",
      };
    }
    return null;
  }, []);

  const advanceActiveOrderStage = useCallback(() => {
    if (!activeOrder) return;
    const stages: ActiveOrder["status"][] = ["confirmed", "queued", "printing", "ready", "completed"];
    const currentIndex = stages.indexOf(activeOrder.status);
    if (currentIndex >= 0 && currentIndex < stages.length - 1) {
      const nextStatus = stages[currentIndex + 1];
      const notif = createStageNotification(activeOrder, nextStatus);
      if (notif) {
        setNotificationItems((items) => items.some((it) => it.id === notif.id) ? items : [notif, ...items]);
      }
      setActiveOrder((current) => current ? { ...current, status: nextStatus } : current);
      setPrintHistory((records) => records.map((record) => record.id === activeOrder.recordId ? { ...record, status: nextStatus } : record));
    }
  }, [activeOrder, createStageNotification]);

  const setOrderStage = useCallback((status: ActiveOrder["status"]) => {
    if (!activeOrder || activeOrder.status === status) return;
    const notif = createStageNotification(activeOrder, status);
    if (notif) {
      setNotificationItems((items) => items.some((it) => it.id === notif.id) ? items : [notif, ...items]);
    }
    setActiveOrder((current) => current ? { ...current, status } : current);
    setPrintHistory((records) => records.map((record) => record.id === activeOrder.recordId ? { ...record, status } : record));
  }, [activeOrder, createStageNotification]);

  const markActiveOrderCompleted = useCallback(() => {
    if (!activeOrder) return;
    const notif = createStageNotification(activeOrder, "completed");
    if (notif) {
      setNotificationItems((items) => items.some((it) => it.id === notif.id) ? items : [notif, ...items]);
    }
    setPrintHistory((records) => records.map((record) => record.id === activeOrder.recordId ? { ...record, status: "completed" } : record));
    setActiveOrder((current) => current ? { ...current, status: "completed" } : null);
  }, [activeOrder, createStageNotification]);

  const cancelActiveOrder = useCallback(() => {
    if (!activeOrder || (activeOrder.status !== "queued" && activeOrder.status !== "confirmed")) return false;
    const notif = createStageNotification(activeOrder, "cancelled");
    if (notif) {
      setNotificationItems((items) => items.some((it) => it.id === notif.id) ? items : [notif, ...items]);
    }
    setActiveOrder((current) => (current?.status === "queued" || current?.status === "confirmed") ? { ...current, status: "cancelled" } : current);
    setPrintHistory((records) => records.map((record) => record.id === activeOrder.recordId ? { ...record, status: "cancelled" } : record));
    return true;
  }, [activeOrder, createStageNotification]);
  const hasDemoData = printHistory.some((record) => record.isDemo);
  const clearDemoData = () => {
    setPrintHistory((records) => records.filter((record) => !record.isDemo));
    setNotificationItems((items) => items.filter((item) => !item.id.includes("demo")));
  };
  const saveProfile = (next: ProfileDetails) => {
    setProfile(next);
  };
  const deleteAllUserData = async () => {
    try {
      await clearClientSideData();
      window.localStorage.setItem(demoDataDisabledKey, "true");
    } catch {
      return false;
    }
    setProfile(emptyProfile);
    setPrintHistory([]);
    setActiveOrder(null);
    setNotificationItems([]);
    if (homeFileInput.current) homeFileInput.current.value = "";
    setUploadedFiles([]);
    setFilePreview(null);
    setHasDocument(false);
    setUploadReady(false);
    setPrintJob({ ...defaultPrintJob });
    setOriginalPrintJob({ ...defaultPrintJob });
    setHasOpenedPreview(false);
    setShowPreview(false);
    setShowPreviewComparison(false);
    setHomeStatusMessage("All data deleted");
    setScreen("home");
    window.scrollTo(0, 0);
    return true;
  };
  useEffect(() => {
    try { window.localStorage.setItem(activeOrderStorageKey, JSON.stringify(activeOrder)); } catch { /* Keep the order available for this session. */ }
  }, [activeOrder]);
  useEffect(() => {
    try { window.localStorage.setItem(profileStorageKey, JSON.stringify(profile)); } catch { /* Keep the profile available for this session. */ }
  }, [profile]);
  useEffect(() => {
    try { window.localStorage.setItem(printHistoryStorageKey, JSON.stringify(printHistory)); } catch { /* Keep print history available for this session. */ }
  }, [printHistory]);
  useEffect(() => {
    const savedSettings: SavedPrintSettings = {
      colour: printJob.colour,
      singleSided: printJob.singleSided,
      paper: printJob.paper,
      copies: printJob.copies,
      pageRange: printJob.pageRange ?? "",
      pageRangeMode: printJob.pageRangeMode ?? "all",
      pagesPerSheet: printJob.pagesPerSheet ?? 1,
      orientation: printJob.orientation ?? "Portrait",
      noteToShop: printJob.noteToShop ?? "",
    };
    try { window.localStorage.setItem(printSettingsStorageKey, JSON.stringify(savedSettings)); } catch { /* Settings remain available for this session. */ }
  }, [printJob.colour, printJob.singleSided, printJob.paper, printJob.copies, printJob.pageRange, printJob.pageRangeMode, printJob.pagesPerSheet, printJob.orientation, printJob.noteToShop]);
  useEffect(() => {
    try {
      window.localStorage.setItem(notificationStorageKey, JSON.stringify(notificationItems));
    } catch {
      // Notifications remain available in memory if browser storage is unavailable.
    }
  }, [notificationItems]);
  useEffect(() => {
    if (!homeStatusMessage) return;
    const timeout = window.setTimeout(() => setHomeStatusMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [homeStatusMessage]);

  const unreadCount = useMemo(() => notificationItems.filter((item) => !item.read).length, [notificationItems]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotificationItems((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotificationItems((items) => items.map((item) => ({ ...item, read: true })));
  }, []);

  const checkClosingNotification = useCallback((status: ShopStatus) => {
    if (!status.dateKey) return;
    const id = `shop-closing-${status.dateKey}`;
    if (status.state === "closing-soon") {
      setNotificationItems((current) => current.some((item) => item.id === id)
        ? current
        : [{
          id,
          type: "shop_closing",
          title: "Print Shop Closing Soon",
          message: `Campus Central Print Shop closes at ${status.closingTime}. Please collect your ready prints before closing!`,
          timestamp: Date.now(),
          orderToken: activeOrder?.token,
          recordId: activeOrder?.recordId,
          read: false,
          iconType: "closing",
        }, ...current]);
    }
  }, [activeOrder]);
  const hasPreviewChanges = (["colour", "singleSided", "paper", "paperSurcharge", "copies", "stockIndex", "stockSurcharge", "pageRange", "pagesPerSheet", "orientation"] as const)
    .some((key) => printJob[key] !== originalPrintJob[key]);
  const openDocumentPreview = () => {
    const showUpdatedVersion = hasOpenedPreview && hasPreviewChanges;
    setShowPreviewComparison(showUpdatedVersion);
    setPreviewVersion(showUpdatedVersion ? "updated" : "original");
    setHasOpenedPreview(true);
    setShowPreview(true);
  };

  const [slideDirection, setSlideDirection] = useState<"forward" | "backward" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const didSwipeRef = useRef<boolean>(false);

  const isMainScreen =
    (screen === "home" && !hasDocument && !isLoginOpen) ||
    screen === "notifications" ||
    screen === "history" ||
    screen === "settings";

  const go = useCallback((next: Screen, explicitDir?: "forward" | "backward") => {
    if (next === "login") {
      clearAuthSession();
      securityEngine.setAuthenticatedUser(null);
      securityEngine.endAdminSession();
      setAuthSession(null);
      setProfile(emptyProfile);
      setActiveOrder(null);
      setPrintHistory([]);
      setNotificationItems([]);
      setScreen("home");
      setIsAuthModalOpen(false);
      window.scrollTo(0, 0);
      return;
    }
    if (next === "home") {
      setHasDocument(false);
    }
    const currIdx = MAIN_TABS.indexOf(screen as NavTab);
    const nextIdx = MAIN_TABS.indexOf(next as NavTab);
    if (currIdx !== -1 && nextIdx !== -1 && currIdx !== nextIdx) {
      const dir = explicitDir || (nextIdx > currIdx ? "forward" : "backward");
      setSlideDirection(dir);
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(() => {
        setSlideDirection(null);
      }, 260);
    }
    setScreen(next);
    window.scrollTo(0, 0);
  }, [screen]);

  const handleSwipeStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isMainScreen) return;

    if ("button" in e && (e as React.MouseEvent).button !== 0) return;

    const target = e.target as HTMLElement | null;
    // Don't intercept text inputs, textareas, selects, or elements flagged with data-no-swipe
    if (
      target &&
      target.closest(
        'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [data-no-swipe="true"]'
      )
    ) {
      touchStartRef.current = null;
      return;
    }

    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    touchDeltaRef.current = { x: 0, y: 0 };
    isHorizontalSwipeRef.current = null;
    didSwipeRef.current = false;
  }, [isMainScreen]);

  const handleSwipeMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current || !isMainScreen) return;

    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;
    touchDeltaRef.current = { x: dx, y: dy };

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (isHorizontalSwipeRef.current === null) {
      if (absX > 6 || absY > 6) {
        if (absY >= absX) {
          // Dominant vertical scrolling: let the page scroll naturally
          isHorizontalSwipeRef.current = false;
          touchStartRef.current = null;
          setIsDragging(false);
          setDragOffset(0);
          return;
        } else {
          // Dominant horizontal motion: confirm swipe
          isHorizontalSwipeRef.current = true;
          didSwipeRef.current = true;
          setIsDragging(true);
        }
      } else {
        return;
      }
    }

    if (isHorizontalSwipeRef.current) {
      const currentIndex = MAIN_TABS.indexOf(screen as NavTab);
      const isAtStart = currentIndex === 0 && dx > 0;
      const isAtEnd = currentIndex === MAIN_TABS.length - 1 && dx < 0;

      let offset = dx * 0.38;
      if (isAtStart || isAtEnd) {
        offset = dx * 0.08; // Heavy resistance at ends
      }
      setDragOffset(offset);
    }
  }, [isMainScreen, screen]);

  const handleSwipeEnd = useCallback(() => {
    if (!touchStartRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const dx = touchDeltaRef.current.x;
    const dy = touchDeltaRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const wasHorizontal = isHorizontalSwipeRef.current === true;
    const wasSwiped = didSwipeRef.current;

    touchStartRef.current = null;
    touchDeltaRef.current = { x: 0, y: 0 };
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
    setDragOffset(0);

    // Suppress accidental tap/click on cards/buttons when completing a swipe gesture
    if (wasSwiped) {
      const preventClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        window.removeEventListener("click", preventClick, true);
      };
      window.addEventListener("click", preventClick, true);
      window.setTimeout(() => window.removeEventListener("click", preventClick, true), 350);
    }

    if (!wasHorizontal) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const isQuickFlick = dt < 300 && absX > 28;
    const isSubstantialSwipe = absX >= 42;

    if ((isSubstantialSwipe || isQuickFlick) && absX > absY * 1.15) {
      const currentIndex = MAIN_TABS.indexOf(screen as NavTab);
      if (currentIndex === -1) return;

      if (dx < 0 && currentIndex < MAIN_TABS.length - 1) {
        // Swiped Left -> Open NEXT screen
        const nextTab = MAIN_TABS[currentIndex + 1];
        go(nextTab, "forward");
      } else if (dx > 0 && currentIndex > 0) {
        // Swiped Right -> Open PREVIOUS screen
        const prevTab = MAIN_TABS[currentIndex - 1];
        go(prevTab, "backward");
      }
    }
  }, [go, screen]);

  // Keyboard navigation for main tabs (Accessibility requirement)
  useEffect(() => {
    const handleMainKeyNavigation = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in forms, inputs or inside modals
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest('input, textarea, select, [contenteditable="true"], [data-no-swipe="true"], [role="dialog"]')
      ) {
        return;
      }
      if (!isMainScreen) return;

      const currentIndex = MAIN_TABS.indexOf(screen as NavTab);
      if (currentIndex === -1) return;

      if (e.key === "ArrowRight" && currentIndex < MAIN_TABS.length - 1) {
        e.preventDefault();
        go(MAIN_TABS[currentIndex + 1], "forward");
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        go(MAIN_TABS[currentIndex - 1], "backward");
      }
    };

    window.addEventListener("keydown", handleMainKeyNavigation);
    return () => window.removeEventListener("keydown", handleMainKeyNavigation);
  }, [isMainScreen, screen, go]);

  const openHomeFilePicker = (preset: PrintJob = defaultPrintJob) => {
    pendingHomePreset.current = preset;
    if (homeFileInput.current) {
      homeFileInput.current.value = "";
      homeFileInput.current.click();
    }
  };

  const handleHomeFilesSelected = (selection?: FileList | File[]) => {
    const selectedFiles = Array.from(selection ?? []);
    if (!selectedFiles.length) return;
    const selected = selectedFiles[selectedFiles.length - 1];

    const uploadedJob = {
      ...pendingHomePreset.current,
      title: "Uploaded Document",
      fileName: selected.name,
      fileSize: `${Math.max(1, Math.round(selected.size / 1024 / 1024))} MB`,
      pages: 1,
    };
    setPrintJob(uploadedJob);
    setOriginalPrintJob(uploadedJob);
    setHasDocument(false);
    setHasOpenedPreview(false);
    setShowPreview(false);
    setPendingHomeFiles(selectedFiles);
    setUploadReady(false);
    go("home");
  };

  const activeProgress = paySheetStep === "details" ? 1 : paySheetStep === "otp" ? 2 : 3;
  const openFile = (file?: File) => {
    if (!file) return;
    setHomeFile(file);
    setPaymentNotice(false);
  };
  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 3) otpInputRefs.current[index + 1]?.focus();
  };
  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4).split("");
    if (!pasted.length) return;
    setOtpDigits(Array.from({ length: 4 }, (_, index) => pasted[index] ?? ""));
    otpInputRefs.current[Math.min(pasted.length - 1, 3)]?.focus();
  };
  const chooseAnotherNumber = () => {
    setPayName("");
    setPayMobile("");
    setNameTouched(false);
    setMobileTouched(false);
    setDetailsAttempted(false);
    setPaySheetStep("details");
  };
  const fileSizeLabel = homeFile
    ? homeFile.size >= 1024 * 1024
      ? `${(homeFile.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(homeFile.size / 1024))} KB`
    : "";
  const phoneMask = payMobile.length === 10 ? `${payMobile.slice(0, 2)}xxxxxx${payMobile.slice(-2)}` : "";

  const renderAuthModal = () => (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => {
        try { window.sessionStorage.setItem("printq-auth-dismissed", "true"); } catch {}
        setIsAuthModalOpen(false);
      }}
      onAuthSuccess={(user) => {
        setAuthSession(user);
        securityEngine.setAuthenticatedUser(user.id);
        setProfile({
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          photo: user.photo || demoProfile.photo,
        });

        const userOrders = securityEngine.getOrdersForCurrentUser();
        if (userOrders.length > 0) {
          const mappedHistory: PrintHistoryRecord[] = userOrders.map((o) => ({
            id: o.id,
            token: o.token,
            job: o.job as PrintJob,
            submittedAt: new Date(o.createdAt).toISOString(),
            status: o.status,
            createdAt: o.createdAt,
          }));
          setPrintHistory(mappedHistory);
          const active = userOrders.find((o) => o.status !== "completed" && o.status !== "cancelled");
          if (active) {
            setActiveOrder({
              recordId: active.id,
              token: active.token,
              job: active.job as PrintJob,
              status: active.status,
              createdAt: active.createdAt,
            });
          } else {
            setActiveOrder(null);
          }
        } else {
          setActiveOrder(null);
          setPrintHistory([]);
        }

        const userNotifs = securityEngine.getNotificationsForCurrentUser();
        if (userNotifs.length > 0) {
          setNotificationItems(userNotifs.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: n.timestamp,
            orderToken: n.orderToken,
            recordId: n.recordId,
            read: n.read,
            iconType: n.iconType as any,
          })));
        } else {
          setNotificationItems([]);
        }

        setIsAuthModalOpen(false);
      }}
    />
  );

  const renderDocumentPreviewModal = () => {
    if (!showPreview) return null;
    const activeFile = uploadedFiles[0] ? {
      name: uploadedFiles[0].name,
      size: uploadedFiles[0].size,
      type: uploadedFiles[0].type,
      raw: uploadedFiles[0],
    } : filePreview;
    return (
      <DocumentPreview
        close={() => setShowPreview(false)}
        totalPages={printJob.pages || 1}
        previewData={activeFile}
        fileName={printJob.fileName || "Document"}
        originalJob={originalPrintJob}
        updatedJob={printJob}
        hasChanges={hasPreviewChanges}
        initialVersion={previewVersion}
      />
    );
  };

  if (isOnboardingOpen) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setIsOnboardingOpen(false);
          setScreen("home");
          try {
            window.localStorage.setItem("onboardingCompleted", "true");
          } catch {}
        }}
      />
    );
  }

  if (screen === "admin") {
    return (
      <div className="app-shell printq-shell">
        <AdminMasterControl
          onBack={() => go("settings")}
          adminUser={{
            uid: authSession?.id || "admin-master-campus-01",
            email: authSession?.email || "admin@campus.edu",
            name: authSession?.name || "Campus Administrator",
          }}
          onOrderUpdated={() => {
            if (authSession) {
              const userOrders = securityEngine.getOrdersForCurrentUser();
              const userNotifs = securityEngine.getNotificationsForCurrentUser();
              if (userOrders.length > 0) {
                const latest = userOrders[0];
                setActiveOrder({
                  recordId: latest.id,
                  token: latest.token,
                  job: latest.job as any,
                  status: latest.status as any,
                  createdAt: latest.createdAt,
                });
              }
              setNotificationItems(userNotifs.map(n => ({
                id: n.id,
                type: n.type as any,
                title: n.title,
                message: n.message,
                timestamp: n.timestamp,
                orderToken: n.orderToken,
                recordId: n.recordId,
                read: n.read,
                iconType: n.iconType as any,
              })));
            }
          }}
        />
      </div>
    );
  }

  if (screen === "checkout") {
    return (
      <div className="app-shell printq-shell">
        <Checkout
          go={go}
          preview={openDocumentPreview}
          job={printJob}
          uploadedFiles={uploadedFiles}
          onOrderConfirmed={(assignedToken) => confirmOrder(assignedToken)}
        />
        {renderDocumentPreviewModal()}
      </div>
    );
  }

  if (screen === "payment") {
    const rawTotalPages = uploadedFiles.length > 0
      ? uploadedFiles.reduce((sum, f) => sum + (f.pages || 1), 0)
      : printJob.pages;
    const fileCalculations = uploadedFiles.length > 0
      ? uploadedFiles.map((file) => {
          const fPages = Math.max(1, file.pages || 1);
          const fPaperStock = normalizePaperStock(printJob.paperStock);
          const fPaperSize = printJob.paper || "A4";
          const fIsSingle = printJob.singleSided || !isDoubleSidedAvailable(fPaperStock);
          const fPricePerSheet = getPricePerSheet(fPaperStock, fPaperSize, fIsSingle, printJob.colour);
          const fCopies = Math.max(1, printJob.copies || 1);
          const fTotalSheets = fPages * fCopies;
          const fSubtotal = fPricePerSheet * fTotalSheets;
          return { subtotal: fSubtotal };
        })
      : [{ subtotal: 0 }];
    const grandTotal = fileCalculations.reduce((sum, item) => sum + item.subtotal, 0);
    return (
      <div className="app-shell printq-shell">
        <PaymentPage
          totalAmount={grandTotal}
          orderSummary={{
            files: uploadedFiles.length || 1,
            pages: rawTotalPages,
            copies: printJob.copies || 1,
          }}
          onPay={() => {
            go("checkout");
          }}
          onBack={() => go("checkout")}
        />
      </div>
    );
  }

  if (screen === "paymentSuccess") {
    return (
      <div className="app-shell printq-shell">
        <PaymentSuccess go={go} order={activeOrder} />
      </div>
    );
  }

  if (screen === "token") {
    return (
      <div className="app-shell printq-shell">
        <Token
          go={go}
          order={activeOrder}
          onCancelOrder={cancelActiveOrder}
          onSetStage={setOrderStage}
        />
      </div>
    );
  }

  if (screen === "notifications") {
    return (
      <div className="app-shell printq-shell">
        <MainSwipeContainer
          dragOffset={dragOffset}
          isDragging={isDragging}
          slideDirection={slideDirection}
          onSwipeStart={handleSwipeStart}
          onSwipeMove={handleSwipeMove}
          onSwipeEnd={handleSwipeEnd}
        >
          <NotificationsScreen
            items={notificationItems}
            onBack={() => go("home")}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onSelectNotification={(item) => {
              markNotificationAsRead(item.id);
              if (item.orderToken) {
                const match = printHistory.find((r) => r.token === item.orderToken || r.id === item.recordId);
                if (match) {
                  setActiveOrder({
                    recordId: match.id,
                    token: match.token,
                    job: match.job,
                    status: match.status,
                    createdAt: match.createdAt,
                  });
                }
                go("token");
              }
            }}
            onStartPrint={() => go("home")}
          />
        </MainSwipeContainer>
        <PrintQNavigation active="notifications" go={go} unreadCount={unreadCount} language={language} />
        {renderDocumentPreviewModal()}
        {renderAuthModal()}
      </div>
    );
  }

  if (screen === "history") {
    return (
      <div className="app-shell printq-shell">
        <MainSwipeContainer
          dragOffset={dragOffset}
          isDragging={isDragging}
          slideDirection={slideDirection}
          onSwipeStart={handleSwipeStart}
          onSwipeMove={handleSwipeMove}
          onSwipeEnd={handleSwipeEnd}
        >
          <main className="printq-simple-page" style={{ maxWidth: 420, margin: "0 auto", padding: "16px 16px calc(78px + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Order History</h1>
              <button
                type="button"
                className="track-action-btn"
                style={{ width: "auto", padding: "6px 14px", height: 32, fontSize: 13 }}
                onClick={() => go("home")}
              >
                ← Back to Home
              </button>
            </div>
            {printHistory.length === 0 ? (
              <section className="printq-empty-state-card history-empty-card" aria-label="No print orders yet">
                <EmptyHistoryIllustration />
                <h2 className="history-empty-title">No Print Orders Yet</h2>
                <p className="history-empty-desc">
                  Upload your lecture notes, assignments, or resumes to get started.
                </p>
                <button
                  type="button"
                  className="history-empty-btn"
                  onClick={() => go("home")}
                >
                  Start a Print →
                </button>
              </section>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {printHistory.map((rec) => {
                  const isCurrentActive = activeOrder?.recordId === rec.id && rec.status !== "completed" && rec.status !== "cancelled";
                  return (
                    <article key={rec.id} className="history-order-card">
                      <div className="history-order-top">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="history-token-pill">{rec.token}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                            {rec.job.fileName}
                          </span>
                        </div>
                        <span className={`history-status-badge ${rec.status}`}>{rec.status}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                        <span>{rec.job.pages} pgs · {rec.job.copies} {rec.job.copies === 1 ? "copy" : "copies"} · {rec.job.colour ? "Colour" : "B&W"} · {rec.job.orientation ?? "Portrait"}</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatPrice(rec.job)}</span>
                      </div>
                      {isCurrentActive && (
                        <button
                          type="button"
                          className="track-action-btn primary"
                          style={{ height: 36, marginTop: 10, fontSize: 13 }}
                          onClick={() => go("token")}
                        >
                          Track Live Order →
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </MainSwipeContainer>
        <PrintQNavigation active="history" go={go} unreadCount={unreadCount} language={language} />
        {renderDocumentPreviewModal()}
        {renderAuthModal()}
      </div>
    );
  }

  if (screen === "settings") {
    const faqs = [
      {
        q: "How do I collect my order?",
        a: "Show your assigned pickup token (e.g. P-92) at the Campus Central counter. No physical slip or printout is needed.",
      },
      {
        q: "Which file formats and sizes are supported?",
        a: "We accept PDF, DOCX, PPTX, JPG, and PNG files up to 50 MB per file, with up to 4 files per batch.",
      },
      {
        q: "What happens if I place an order after hours?",
        a: "Orders submitted after 5:00 PM or on weekends are safely saved in the queue and printed first thing the next working morning at 9:30 AM.",
      },
      {
        q: "Can I cancel a print order?",
        a: "You can cancel any queued order directly from the tracking screen before printing begins.",
      },
    ];

    return (
      <div className="app-shell printq-shell">
        <MainSwipeContainer
          dragOffset={dragOffset}
          isDragging={isDragging}
          slideDirection={slideDirection}
          onSwipeStart={handleSwipeStart}
          onSwipeMove={handleSwipeMove}
          onSwipeEnd={handleSwipeEnd}
        >
          <main className="printq-simple-page" style={{ maxWidth: 420, margin: "0 auto", padding: "16px 16px calc(78px + env(safe-area-inset-bottom, 0px))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Shop & Settings</h1>
            <button
              type="button"
              className="track-action-btn"
              style={{ width: "auto", padding: "6px 14px", height: 32, fontSize: 13 }}
              onClick={() => go("home")}
            >
              ← Back to Home
            </button>
          </div>
          
          {/* User Account & Authentication Profile */}
          <section className="settings-profile-card">
            <div className="settings-profile-avatar">
              {authSession ? authSession.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2) : "G"}
            </div>
            <div className="settings-profile-info">
              <strong className="settings-profile-name">
                {authSession ? authSession.name : "Guest User"}
              </strong>
              <div className="settings-profile-meta">
                <span>{authSession ? authSession.email : "Not signed in"}</span>
                {authSession?.phoneVerified && (
                  <span className="settings-profile-verified-pill">✓ Verified</span>
                )}
              </div>
              {authSession && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                    UID: {authSession.id}
                  </span>
                  {(authSession.role === "admin" || securityEngine.isProvisionedAdmin(authSession.id)) && (
                    <span style={{ fontSize: 9.5, color: "var(--accent)", background: "rgba(244, 215, 121, 0.15)", padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>
                      ADMIN
                    </span>
                  )}
                </div>
              )}
              {authSession?.phone && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{authSession.phone}</span>
              )}
            </div>
            {authSession ? (
              <button
                type="button"
                className="settings-profile-action-btn"
                onClick={() => {
                  clearAuthSession();
                  securityEngine.setAuthenticatedUser(null);
                  securityEngine.endAdminSession();
                  setAuthSession(null);
                  setProfile(emptyProfile);
                  setActiveOrder(null);
                  setPrintHistory([]);
                  setNotificationItems([]);
                  setIsAuthModalOpen(false);
                  setScreen("home");
                  window.scrollTo(0, 0);
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                className="settings-profile-action-btn"
                style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                onClick={() => setIsAuthModalOpen(true)}
              >
                Sign in with Google
              </button>
            )}
          </section>

          {/* Admin Master Control Entry Point */}
          {authSession && (authSession.role === "admin" || securityEngine.isProvisionedAdmin(authSession.id)) && (
            <section className="bill-card settings-section-card" style={{ borderColor: "rgba(244, 215, 121, 0.35)", background: "rgba(244, 215, 121, 0.05)", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>🛡️ Admin Master Control</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(244, 215, 121, 0.15)", color: "var(--accent)" }}>Privileged</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                    Manage campus queue, users, print shop hardware, and audit logs.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-header-action-btn primary"
                  style={{ background: "var(--accent)", color: "#0A0A0A", fontWeight: 700, flexShrink: 0, padding: "8px 12px", fontSize: 12 }}
                  onClick={() => go("admin")}
                >
                  Master Control →
                </button>
              </div>
            </section>
          )}

          {/* Language Selection Section */}
          <section className="bill-card settings-section-card" aria-labelledby="heading-display-language">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px" }}>
              <h2 id="heading-display-language" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                🌐 {getTranslation(language, "settings_language_section")}
              </h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "rgba(244, 215, 121, 0.12)", padding: "2px 7px", borderRadius: 5 }}>
                {language.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
              {getTranslation(language, "settings_language_desc")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { code: "en", label: "English", native: "English" },
                { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
                { code: "hi", label: "Hindi", native: "हिन्दी" },
              ].map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code as SupportedLanguage);
                      saveStoredLanguage(lang.code as SupportedLanguage);
                    }}
                    style={{
                      background: isSelected ? "var(--accent)" : "var(--surface)",
                      color: isSelected ? "#0A0A0A" : "var(--text)",
                      border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "10px 6px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      cursor: "pointer",
                      fontWeight: isSelected ? 800 : 500,
                      transition: "all 140ms ease",
                    }}
                    aria-pressed={isSelected}
                    aria-label={`Select ${lang.label} language`}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{lang.native}</span>
                    <span style={{ fontSize: 10, opacity: isSelected ? 0.85 : 0.65 }}>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 1. Shop Hours & Printer Status Card */}
          <section className="bill-card settings-section-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Campus Central Print Shop</h2>
              <span className="settings-printer-badge">
                <span className="settings-printer-dot" />
                HP Printer Online
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Working Hours</span>
                <strong style={{ color: "var(--text)" }}>9:30 AM – 5:00 PM</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Working Days</span>
                <span style={{ color: "var(--text)" }}>Monday – Friday</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Weekend (Sat & Sun)</span>
                <span style={{ color: "#F43F5E", fontWeight: 600 }}>Closed</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Location</span>
                <span style={{ color: "var(--text)" }}>Campus Central Building</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Printer Model</span>
                <span style={{ color: "var(--text)" }}>HP PageWide Pro 777z</span>
              </div>
            </div>
          </section>

          {/* 2. Contact Print Shop (Moved directly below Campus Central Print Shop) */}
          <section className="bill-card settings-section-card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Contact Print Shop</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px" }}>
              Questions about an order, custom binding, or campus billing?
            </p>
            <div className="settings-support-actions">
              <a href="tel:9876543210" className="settings-support-btn" aria-label="Call Campus Helpdesk">
                📞 Call Helpdesk
              </a>
              <a href="mailto:printshop@campus.edu" className="settings-support-btn" aria-label="Email Print Shop Support">
                ✉ Email Support
              </a>
            </div>
          </section>

          {/* 3. Default Print Preferences */}
          <section className="bill-card settings-section-card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Default Print Preferences</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
              Saved preferences applied automatically when you upload new files.
            </p>
            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Default Color</span>
                <span className="settings-pref-desc">{printJob.colour ? "Full colour printing (₹8/page)" : "Black & White economical (₹2/page)"}</span>
              </div>
              <div className="settings-segmented-group" role="group" aria-label="Default Color">
                <button
                  type="button"
                  className={`settings-segmented-btn${!printJob.colour ? " is-active" : ""}`}
                  onClick={() => setPrintJob((j) => ({ ...j, colour: false, pricePerPage: 2 }))}
                >
                  B&W (₹2)
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn${printJob.colour ? " is-active" : ""}`}
                  onClick={() => setPrintJob((j) => ({ ...j, colour: true, pricePerPage: 8 }))}
                >
                  Colour (₹8)
                </button>
              </div>
            </div>

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Default Print Sides</span>
                <span className="settings-pref-desc">{printJob.singleSided ? "Single-sided sheets" : "Double-sided duplex (standard)"}</span>
              </div>
              <div className="settings-segmented-group" role="group" aria-label="Default Print Sides">
                <button
                  type="button"
                  className={`settings-segmented-btn${!printJob.singleSided ? " is-active" : ""}`}
                  onClick={() => setPrintJob((j) => ({ ...j, singleSided: false }))}
                >
                  2-Sided
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn${printJob.singleSided ? " is-active" : ""}`}
                  onClick={() => setPrintJob((j) => ({ ...j, singleSided: true }))}
                >
                  1-Sided
                </button>
              </div>
            </div>

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Default Paper Size</span>
                <span className="settings-pref-desc">Standard college submission format</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", padding: "4px 8px", background: "var(--surface-raised)", borderRadius: 6 }}>
                A4 (210 × 297 mm)
              </span>
            </div>

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Auto-open print settings</span>
                <span className="settings-pref-desc">Navigate directly to settings once upload finishes</span>
              </div>
              <button
                type="button"
                className={`printq-switch${autoOpenSettings ? " is-active" : ""}`}
                onClick={() => setAutoOpenSettings(!autoOpenSettings)}
                role="switch"
                aria-checked={autoOpenSettings}
                aria-label="Toggle auto-open print settings"
              >
                <span className="printq-switch-thumb" />
              </button>
            </div>
          </section>

          {/* 4. Notifications & Alerts */}
          <section className="bill-card settings-section-card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Notifications & Alerts</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
              Keep updated on your queue position and pickup ready alerts.
            </p>
            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Order Ready Alerts</span>
                <span className="settings-pref-desc">Push alerts as soon as prints are ready for pickup</span>
              </div>
              <button
                type="button"
                className={`printq-switch${notifyOrderReady ? " is-active" : ""}`}
                onClick={() => setNotifyOrderReady(!notifyOrderReady)}
                role="switch"
                aria-checked={notifyOrderReady}
                aria-label="Toggle Order Ready Alerts"
              >
                <span className="printq-switch-thumb" />
              </button>
            </div>

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Shop Closing Warning</span>
                <span className="settings-pref-desc">Remind 30 mins before shop closes at 5:00 PM</span>
              </div>
              <button
                type="button"
                className={`printq-switch${notifyShopClosing ? " is-active" : ""}`}
                onClick={() => setNotifyShopClosing(!notifyShopClosing)}
                role="switch"
                aria-checked={notifyShopClosing}
                aria-label="Toggle Shop Closing Warning"
              >
                <span className="printq-switch-thumb" />
              </button>
            </div>

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <span className="settings-pref-title">Sound & Haptics</span>
                <span className="settings-pref-desc">Chime and vibration on order progress</span>
              </div>
              <button
                type="button"
                className={`printq-switch${soundEnabled ? " is-active" : ""}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                role="switch"
                aria-checked={soundEnabled}
                aria-label="Toggle Sound & Haptics"
              >
                <span className="printq-switch-thumb" />
              </button>
            </div>

            <button
              type="button"
              className="track-action-btn"
              style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
              onClick={() => go("notifications")}
            >
              View Order Notifications ({unreadCount} unread) →
            </button>
          </section>

          {/* 5. Help & FAQs Accordion */}
          <section className="bill-card settings-section-card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Help & Guidelines</h2>
            <div>
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div key={faq.q} className="settings-faq-item">
                    <button
                      type="button"
                      className="settings-faq-question"
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="settings-faq-icon">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="settings-faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. Data Actions & Version */}
          <section className="bill-card settings-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 12px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Data & Reset</h2>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>v2.4.0 (Campus)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {hasDemoData && (
                <button
                  type="button"
                  className="track-action-btn"
                  onClick={clearDemoData}
                >
                  Clear Demo Orders
                </button>
              )}
              <button
                type="button"
                className="track-action-btn"
                onClick={() => {
                  try {
                    window.localStorage.removeItem("onboardingCompleted");
                  } catch {}
                  setIsOnboardingOpen(true);
                }}
              >
                Replay Onboarding Tour
              </button>
              <button
                type="button"
                className="track-action-btn"
                style={{ color: "#F43F5E", borderColor: "rgba(244, 63, 94, 0.3)" }}
                onClick={deleteAllUserData}
              >
                Reset All App Data
              </button>
            </div>
          </section>
        </main>
        </MainSwipeContainer>
        <PrintQNavigation active="settings" go={go} unreadCount={unreadCount} language={language} />
        {renderDocumentPreviewModal()}
        {renderAuthModal()}
      </div>
    );
  }

  if (hasDocument) {
    return (
      <div className="app-shell printq-shell">
        <main className="printq-home has-uploaded-file">
          <Document
            onBack={() => {
              setHasDocument(false);
              setUploadedFiles([]);
            }}
            onNotifications={() => go("notifications")}
            unreadCount={unreadCount}
            onPay={(summary) => {
              setLoginSummary(summary);
              const remembered = readRememberedPayUser();
              if (remembered) {
                go("checkout");
              } else {
                setIsLoginOpen(true);
              }
            }}
            paymentNotice={paymentNotice}
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
            setUploadReady={setUploadReady}
            initialFiles={pendingHomeFiles}
            onInitialFilesConsumed={() => setPendingHomeFiles([])}
            searchQuery={searchQuery}
            authSession={authSession}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        </main>

        {isLoginOpen && loginSummary && (
          <LoginSheet
            summary={loginSummary}
            onPaymentContinue={() => {
              setIsLoginOpen(false);
              go("checkout");
            }}
            onClose={() => {
              setIsLoginOpen(false);
              window.setTimeout(() => document.querySelector<HTMLButtonElement>(".printq-paybar .printq-pay-button")?.focus(), 0);
            }}
          />
        )}
        {renderDocumentPreviewModal()}
        {renderAuthModal()}
      </div>
    );
  }

  return (
    <div className="app-shell printq-shell">
      <MainSwipeContainer
        dragOffset={dragOffset}
        isDragging={isDragging}
        slideDirection={slideDirection}
        onSwipeStart={handleSwipeStart}
        onSwipeMove={handleSwipeMove}
        onSwipeEnd={handleSwipeEnd}
      >
        <main className="printq-home">
          {activeOrder && activeOrder.status !== "completed" && activeOrder.status !== "cancelled" && (
            <div
              className="home-active-order-banner"
              onClick={() => go("token")}
              role="button"
              tabIndex={0}
              aria-label={`Active print order token ${activeOrder.token}. Tap to track status.`}
            >
              <div className="home-active-order-left">
                <span className="home-active-order-pulse-dot" />
                <div>
                  <div className="home-active-order-title">
                    Active Print Order <span className="home-active-order-token-pill">{activeOrder.token}</span>
                  </div>
                  <div className="home-active-order-sub">
                    {activeOrder.status === "ready"
                      ? "🎉 Ready for pickup now at Campus Central!"
                      : activeOrder.status === "printing"
                      ? "Printing in progress on Printer #2"
                      : "Queued at Campus Central · Tap to track"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="home-active-order-track-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  go("token");
                }}
              >
                Track Order →
              </button>
            </div>
          )}

          <HomeShortcuts
            language={language}
            go={go}
            activeOrder={activeOrder}
            nowServing={nowServing}
            onSelectShortcut={(tool) => {
              if (tool === "language") go("settings");
            }}
          />

          <Document
            onBack={() => go("home")}
            onNotifications={() => go("notifications")}
            unreadCount={unreadCount}
            onPay={(summary) => {
              setLoginSummary(summary);
              const remembered = readRememberedPayUser();
              if (remembered) {
                go("checkout");
              } else {
                setIsLoginOpen(true);
              }
            }}
            paymentNotice={paymentNotice}
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
            setUploadReady={setUploadReady}
            initialFiles={pendingHomeFiles}
            onInitialFilesConsumed={() => setPendingHomeFiles([])}
            searchQuery={searchQuery}
            authSession={authSession}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        </main>
      </MainSwipeContainer>

      {isLoginOpen && loginSummary && (
        <LoginSheet
          summary={loginSummary}
          onPaymentContinue={() => {
            setIsLoginOpen(false);
            go("checkout");
          }}
          onClose={() => {
            setIsLoginOpen(false);
            window.setTimeout(() => document.querySelector<HTMLButtonElement>(".printq-paybar .printq-pay-button")?.focus(), 0);
          }}
        />
      )}

      {!isLoginOpen && screen === "home" && (
        <PrintQNavigation active="home" go={go} unreadCount={unreadCount} language={language} />
      )}
      {renderDocumentPreviewModal()}
      {renderAuthModal()}
    </div>
  );
}

function MainSwipeContainer({
  children,
  dragOffset,
  isDragging,
  slideDirection,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
}: {
  children: React.ReactNode;
  dragOffset: number;
  isDragging: boolean;
  slideDirection: "forward" | "backward" | null;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (e: React.TouchEvent | React.MouseEvent) => void;
}) {
  const transformStyle = dragOffset !== 0 ? { transform: `translate3d(${dragOffset}px, 0, 0)` } : undefined;
  const slideClass = slideDirection === "forward" ? " slide-forward" : slideDirection === "backward" ? " slide-backward" : "";

  return (
    <div
      className={`screen-swipe-wrapper${isDragging ? " is-dragging" : ""}`}
      onTouchStart={onSwipeStart}
      onTouchMove={onSwipeMove}
      onTouchEnd={onSwipeEnd}
      onMouseDown={onSwipeStart}
      onMouseMove={onSwipeMove}
      onMouseUp={onSwipeEnd}
      onMouseLeave={onSwipeEnd}
    >
      <div
        className={`screen-swipe-content${isDragging ? " is-dragging" : ""}${slideClass}`}
        style={transformStyle}
      >
        {children}
      </div>
    </div>
  );
}

function PrintQNavigation({
  active,
  go,
  unreadCount = 0,
  language = "en",
}: {
  active: NavTab;
  go: (screen: Screen) => void;
  unreadCount?: number;
  language?: SupportedLanguage;
}) {
  const tabs: { id: NavTab; label: string }[] = [
    { id: "home", label: getTranslation(language, "nav_home") || "Home" },
    { id: "notifications", label: getTranslation(language, "nav_alerts") || "Alerts" },
    { id: "history", label: getTranslation(language, "nav_history") || "History" },
    { id: "settings", label: getTranslation(language, "nav_settings") || "Settings" },
  ];

  return (
    <nav className="printq-icon-menu" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-label={tab.id === "notifications" ? "Notifications" : tab.label}
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => go(tab.id)}
          className={active === tab.id ? "is-active" : undefined}
        >
          <div className="nav-icon-container">
            <NavigationIcon name={tab.id} active={active === tab.id} />
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="nav-badge" aria-label={`${unreadCount} unread notifications`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

function NavigationIcon({ name, active }: { name: NavTab; active: boolean }) {
  if (name === "home") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? "rgba(244, 215, 121, 0.15)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.9"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-6v6H4.5A1.5 1.5 0 0 1 3 19.5v-9Z" />
      </svg>
    );
  }
  if (name === "notifications") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? "rgba(244, 215, 121, 0.15)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.9"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }
  if (name === "history") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? "rgba(244, 215, 121, 0.15)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.9"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.5" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? "rgba(244, 215, 121, 0.15)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.9"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

