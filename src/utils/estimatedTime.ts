import { shopHours } from "../config/shopHours";

export type CompletionEstimate = {
  totalMinutes: number;
  minutes: number;
  readyTimeFormatted: string;
  isQueueAvailable: boolean;
  queueStatus: "normal" | "busy" | "unavailable";
  primaryText: string;
  subText: string;
  totalPages: number;
  label: string;
  detail: string;
  fullDescription: string;
  isShopOpen: boolean;
  isNextDay: boolean;
  readyDate?: Date;
};

export function calculateEstimatedReadyTime(options: {
  pages?: number;
  copies?: number;
  fileCount?: number;
  colour?: boolean;
  singleSided?: boolean;
  paper?: string;
  paperStock?: string;
  requestedPickupMinutes?: number;
  queueStatus?: "normal" | "busy" | "unavailable";
  queueAvailable?: boolean;
  baseTime?: Date;
}): CompletionEstimate {
  const {
    pages = 1,
    copies = 1,
    colour = false,
    paperStock = "Regular",
    requestedPickupMinutes,
    queueStatus = "normal",
    queueAvailable = true,
    baseTime = new Date(),
  } = options;

  // Step 1 — Total Pages
  const safePages = Math.max(0, pages);
  const safeCopies = Math.max(1, Math.min(20, copies));
  const totalPages = safePages * safeCopies;

  if (safePages === 0 || totalPages === 0) {
    return {
      totalMinutes: 0,
      minutes: 0,
      readyTimeFormatted: "--:--",
      isQueueAvailable: queueAvailable,
      queueStatus,
      primaryText: "Add a file to see estimated time",
      subText: "Upload a document to calculate completion time",
      totalPages: 0,
      label: "Add a file to see estimated time",
      detail: "Add a file to see estimated time",
      fullDescription: "Add a file to see estimated time",
      isShopOpen: true,
      isNextDay: false,
    };
  }

  // Step 2 — Production Time
  // Base Time: total pages × 0.5 minutes
  const baseMinutes = totalPages * 0.5;
  // Colour Extra: Full Colour adds total pages × 0.3 minutes
  const colourExtra = colour ? totalPages * 0.3 : 0;
  // Paper Extra: Special paper adds total pages × 0.2 minutes
  const isSpecialPaper = /premium|glossy|matte|photo/i.test(paperStock);
  const paperExtra = isSpecialPaper ? totalPages * 0.2 : 0;
  // Queue Buffer
  let queueBuffer = 3;
  if (queueAvailable) {
    queueBuffer = queueStatus === "busy" ? 5 : 2;
  }

  // Raw production duration in minutes
  let productionMinutes = Math.max(1, Math.round(baseMinutes + colourExtra + paperExtra + queueBuffer));
  if (requestedPickupMinutes && requestedPickupMinutes > productionMinutes) {
    productionMinutes = requestedPickupMinutes;
  }

  // Step 3 — Enforce Shop Working Hours (9:30 AM to 5:00 PM)
  const [openHour, openMin] = shopHours.openingTime.split(":").map(Number); // 9, 30
  const [closeHour, closeMin] = shopHours.closingTime.split(":").map(Number); // 17, 0
  const shopOpenMinutes = openHour * 60 + openMin; // 570
  const shopCloseMinutes = closeHour * 60 + closeMin; // 1020

  const nowDay = baseTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isShopOpenToday = shopHours.openWeekdays.includes(nowDay as any);
  const nowMinutes = baseTime.getHours() * 60 + baseTime.getMinutes();

  let readyDate = new Date(baseTime);
  let isNextDay = false;
  let isShopOpen = false;
  let dayPrefix = "";

  const advanceToNextWorkingDay = (date: Date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (!shopHours.openWeekdays.includes(next.getDay() as any)) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(openHour, openMin, 0, 0);
    return next;
  };

  if (!isShopOpenToday) {
    // Today is Sunday / closed day: rolls over to next working day (e.g. Monday 9:30 AM)
    isShopOpen = false;
    isNextDay = true;
    readyDate = advanceToNextWorkingDay(baseTime);
    readyDate = new Date(readyDate.getTime() + productionMinutes * 60 * 1000);
    const dayName = readyDate.toLocaleDateString([], { weekday: "short" });
    dayPrefix = `${dayName} `;
  } else if (nowMinutes < shopOpenMinutes) {
    // Before shop opens today (e.g. 8:00 AM): starts at 9:30 AM today
    isShopOpen = false;
    isNextDay = false;
    readyDate.setHours(openHour, openMin, 0, 0);
    readyDate = new Date(readyDate.getTime() + productionMinutes * 60 * 1000);
  } else if (nowMinutes >= shopCloseMinutes) {
    // After shop closes today (after 5:00 PM): rolls over to next working day
    isShopOpen = false;
    isNextDay = true;
    readyDate = advanceToNextWorkingDay(baseTime);
    readyDate = new Date(readyDate.getTime() + productionMinutes * 60 * 1000);
    const dayName = readyDate.toLocaleDateString([], { weekday: "short" });
    dayPrefix = dayName === "Mon" && nowDay === 6 ? "Mon " : "tomorrow ";
  } else {
    // During shop hours (9:30 AM - 5:00 PM)
    isShopOpen = true;
    const finishMinutes = nowMinutes + productionMinutes;
    if (finishMinutes <= shopCloseMinutes) {
      // Finishes today before 5:00 PM
      isNextDay = false;
      readyDate = new Date(baseTime.getTime() + productionMinutes * 60 * 1000);
    } else {
      // Cannot finish before 5:00 PM today: rolls over remaining to next working day
      isNextDay = true;
      const minutesToday = Math.max(0, shopCloseMinutes - nowMinutes);
      const remainingMinutes = Math.max(1, productionMinutes - minutesToday);
      readyDate = advanceToNextWorkingDay(baseTime);
      readyDate = new Date(readyDate.getTime() + remainingMinutes * 60 * 1000);
      const dayName = readyDate.toLocaleDateString([], { weekday: "short" });
      dayPrefix = dayName === "Mon" && nowDay === 6 ? "Mon " : "tomorrow ";
    }
  }

  // Calculate day prefix based on day difference
  const diffDays = Math.round((new Date(readyDate.getFullYear(), readyDate.getMonth(), readyDate.getDate()).getTime() -
    new Date(baseTime.getFullYear(), baseTime.getMonth(), baseTime.getDate()).getTime()) / 86400000);
  if (diffDays === 1) {
    dayPrefix = "tomorrow ";
  } else if (diffDays > 1) {
    const dayName = readyDate.toLocaleDateString([], { weekday: "short" });
    dayPrefix = `${dayName} `;
  } else {
    dayPrefix = "";
  }

  // Format time (e.g. "11:45 AM")
  const readyTimeFormatted = readyDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  let primaryText = "";
  let subText = "";

  if (isShopOpen && !isNextDay) {
    primaryText = `Estimated ready around ${readyTimeFormatted}`;
    subText = queueAvailable ? "Based on current queue (9:30 AM–5:00 PM)" : "Estimate · 9:30 AM–5:00 PM";
  } else if (!isShopOpen && !isNextDay) {
    // Before 9:30 AM today
    primaryText = `Opens at 9:30 AM · Ready around ${readyTimeFormatted}`;
    subText = "Printing starts at 9:30 AM";
  } else {
    // Closed / Rollover to next day
    primaryText = `Shop closed · Ready ${dayPrefix}around ${readyTimeFormatted}`;
    subText = "Campus shop hours: 9:30 AM to 5:00 PM (Mon–Fri)";
  }


  return {
    totalMinutes: productionMinutes,
    minutes: productionMinutes,
    readyTimeFormatted,
    isQueueAvailable: queueAvailable,
    queueStatus,
    primaryText,
    subText,
    totalPages,
    label: primaryText,
    detail: subText,
    fullDescription: `${primaryText} · ${subText}`,
    isShopOpen,
    isNextDay,
    readyDate,
  };
}
