/**
 * Campus Print Shop schedule.
 * Operates Monday to Friday, 9:30 AM to 5:00 PM. Saturday & Sunday closed.
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

const weekdayNumbers: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function getShopStatus(now: Date = new Date()): ShopStatus {
  if (!shopHours.timeZone || !shopHours.closingTime || !shopHours.openingTime) {
    return { state: "unavailable" };
  }

  const parts = getShopTimeParts(now);
  const weekday = weekdayNumbers[parts.weekday];
  const dateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const [openingHour, openingMinute] = shopHours.openingTime.split(":").map(Number);
  const [closingHour, closingMinute] = shopHours.closingTime.split(":").map(Number);
  const currentMinutes = parts.hour * 60 + parts.minute;
  const openingMinutes = openingHour * 60 + openingMinute;
  const closingMinutes = closingHour * 60 + closingMinute;
  const remainingMs = ((closingMinutes - currentMinutes) * 60 - parts.second) * 1000;
  const clockHour = closingHour % 12 || 12;
  const closingTime = `${clockHour}:${String(closingMinute).padStart(2, "0")} ${closingHour < 12 ? "AM" : "PM"}`;

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isBeforeOpenToday = isWeekday && currentMinutes < openingMinutes;
  const isFridayAfterClose = weekday === 5 && (currentMinutes >= closingMinutes || remainingMs <= 0);
  const isWeekend = weekday === 6 || weekday === 7;

  let nextOpeningText = "Opens Monday at 9:30 AM";
  if (isBeforeOpenToday) {
    nextOpeningText = "Opens today at 9:30 AM";
  } else if (isWeekday && !isFridayAfterClose && (currentMinutes >= closingMinutes || remainingMs <= 0)) {
    nextOpeningText = "Opens tomorrow at 9:30 AM";
  } else if (isFridayAfterClose || isWeekend) {
    nextOpeningText = "Opens Monday at 9:30 AM";
  }

  if (!isWeekday || currentMinutes < openingMinutes || remainingMs <= 0) {
    return { state: "closed", dateKey, closingTime, nextOpeningText };
  }

  return {
    state: remainingMs <= shopHours.closingWarningMinutes * 60_000 ? "closing-soon" : "open",
    dateKey,
    closingTime,
    remainingMs,
    nextOpeningText,
  };
}


export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
