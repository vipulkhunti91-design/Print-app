/**
 * Campus Print Shop schedule.
 * Operates Daily, 24/7 Online Queue & Smart Campus Kiosk.
 * Counter staff available Monday to Sunday, 8:00 AM to 11:00 PM.
 * Times are interpreted in the configured shop timezone.
 */
export const shopHours = {
  timeZone: "Asia/Kolkata",
  openWeekdays: [0, 1, 2, 3, 4, 5, 6] as readonly number[], // All 7 days active (Sunday through Saturday)
  openingTime: "00:00", // Online queue & printing active 24/7
  closingTime: "23:59",
  closingWarningMinutes: 0,
} as const;

export type ShopStatus = {
  state: "open" | "closing-soon" | "closed" | "unavailable";
  dateKey?: string;
  closingTime?: string;
  remainingMs?: number;
  nextOpeningText?: string;
};

const getShopTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: shopHours.timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    weekday: values.weekday,
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

export function getShopStatus(now: Date = new Date()): ShopStatus {
  const parts = getShopTimeParts(now);
  const dateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

  return {
    state: "open",
    dateKey,
    closingTime: "11:00 PM",
    remainingMs: 86400000,
    nextOpeningText: "Open Daily · 24/7 Online Queue",
  };
}


export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
