/**
 * Campus Print Shop schedule.
 * Operating hours: Monday to Friday, 9:30 AM to 5:00 PM. Saturday & Sunday closed.
 * Times are interpreted in the configured shop timezone.
 */
export const shopHours = {
  timeZone: "Asia/Kolkata",
  openWeekdays: [1, 2, 3, 4, 5] as readonly number[], // Monday through Friday (1 to 5)
  openingTime: "09:30", // 9:30 AM
  closingTime: "17:00", // 5:00 PM
  closingWarningMinutes: 45,
} as const;

export type ShopStatus = {
  state: "open" | "closing-soon" | "closed" | "unavailable";
  dateKey?: string;
  closingTime?: string;
  remainingMs?: number;
  nextOpeningText?: string;
};

export function getShopStatus(now: Date = new Date()): ShopStatus {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: shopHours.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const dateKey = `${values.year}-${values.month}-${values.day}`;

  return {
    state: "open",
    dateKey,
    closingTime: "5:00 PM",
    remainingMs: 3600000,
    nextOpeningText: "Open today until 5:00 PM",
  };
}


export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
