export const NORWAY_TIME_ZONE = "Europe/Oslo";
export const NORWAY_LOCALE = "en-GB";

type DateInput = string | number | Date;

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: NORWAY_TIME_ZONE,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: NORWAY_TIME_ZONE,
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: NORWAY_TIME_ZONE,
};

export function formatNorway(
  value: DateInput,
  options: Intl.DateTimeFormatOptions,
  fallback = "TBD",
): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(NORWAY_LOCALE, {
    ...options,
    timeZone: NORWAY_TIME_ZONE,
  }).format(date);
}

export function formatNorwayDateTime(value: DateInput, fallback = "TBD"): string {
  return formatNorway(value, DATE_TIME_OPTIONS, fallback);
}

export function formatNorwayDate(value: DateInput, fallback = "TBD"): string {
  return formatNorway(value, DATE_OPTIONS, fallback);
}

export function formatNorwayTime(value: DateInput, fallback = "TBD"): string {
  return formatNorway(value, TIME_OPTIONS, fallback);
}

export function norwayDateKey(value: DateInput): string {
  const date = toValidDate(value);
  if (!date) return "";
  const parts = norwayParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function toNorwayDateTimeLocalInput(value: DateInput | null | undefined): string {
  if (value == null) return "";
  const date = toValidDate(value);
  if (!date) return "";
  const parts = norwayParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function fromNorwayDateTimeLocalInput(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error("Time must be a valid Norway date and time");
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const wallClockUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  let utcMs = wallClockUtcMs - norwayOffsetMs(new Date(wallClockUtcMs));
  utcMs = wallClockUtcMs - norwayOffsetMs(new Date(utcMs));
  return new Date(utcMs).toISOString();
}

export function norwayDayBoundsUtc(value: DateInput = new Date()): {
  date: string;
  startIso: string;
  endIso: string;
} {
  const date = norwayDateKey(value);
  if (!date) {
    throw new Error("Date must be valid");
  }

  const startIso = fromNorwayDateTimeLocalInput(`${date}T00:00`);
  const [year, month, day] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${nextDay.getUTCFullYear()}-${pad2(nextDay.getUTCMonth() + 1)}-${pad2(nextDay.getUTCDate())}`;
  const nextStartMs = new Date(fromNorwayDateTimeLocalInput(`${nextDate}T00:00`)).getTime();

  return {
    date,
    startIso,
    endIso: new Date(nextStartMs - 1).toISOString(),
  };
}

function toValidDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function norwayOffsetMs(date: Date): number {
  const parts = norwayParts(date, true);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function norwayParts(date: Date, includeSecond = false) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: NORWAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSecond ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second ?? "00",
  };
}

function pad2(value: string | number): string {
  return String(value).padStart(2, "0");
}
