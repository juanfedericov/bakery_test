export type ScheduleWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ScheduleDeliveryMethod = "pickup" | "delivery";

type ScheduleTime = string | Date;

export interface WeeklyScheduleRule {
  weekday: ScheduleWeekday;
  deliveryMethod: ScheduleDeliveryMethod;
  isOpen: boolean;
  opensAt: ScheduleTime;
  closesAt: ScheduleTime;
  slotIntervalMinutes: number;
}

export interface ScheduleException {
  date: string | Date;
  deliveryMethod: ScheduleDeliveryMethod;
  isClosed: boolean;
  opensAt?: ScheduleTime | null;
  closesAt?: ScheduleTime | null;
  slotIntervalMinutes?: number | null;
}

export interface CalculateAvailableSlotsOptions {
  date: string;
  deliveryMethod: ScheduleDeliveryMethod;
  timeZone: string;
  weeklyRules: readonly WeeklyScheduleRule[];
  exceptions: readonly ScheduleException[];
  minimumAdvanceMinutes: number;
  now?: Date;
}

const WEEKDAYS: readonly ScheduleWeekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface LocalDateTime extends CalendarDate {
  hour: number;
  minute: number;
  second: number;
}

function parseDate(date: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Invalid schedule date: ${date}`);

  const parsed = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const check = new Date(0);
  check.setUTCHours(0, 0, 0, 0);
  check.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
  if (
    check.getUTCFullYear() !== parsed.year
    || check.getUTCMonth() !== parsed.month - 1
    || check.getUTCDate() !== parsed.day
  ) {
    throw new RangeError(`Invalid schedule date: ${date}`);
  }
  return parsed;
}

function dateKey(date: string | Date): string {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) throw new RangeError("Invalid exception date");
    return [
      String(date.getUTCFullYear()).padStart(4, "0"),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }
  parseDate(date);
  return date;
}

function parseTime(time: ScheduleTime): number {
  if (time instanceof Date) {
    if (Number.isNaN(time.getTime())) throw new RangeError("Invalid schedule time");
    if (time.getUTCSeconds() !== 0 || time.getUTCMilliseconds() !== 0) {
      throw new RangeError("Schedule times must have minute precision");
    }
    return time.getUTCHours() * 60 + time.getUTCMinutes();
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
  if (!match || (match[3] !== undefined && Number(match[3]) !== 0)) {
    throw new RangeError(`Invalid schedule time: ${time}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function localDateTimeAt(
  date: CalendarDate,
  minutes: number,
  formatter: Intl.DateTimeFormat,
): Date | null {
  const expected: LocalDateTime = {
    ...date,
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    second: 0,
  };
  const targetUtc = new Date(0);
  targetUtc.setUTCHours(expected.hour, expected.minute, 0, 0);
  targetUtc.setUTCFullYear(expected.year, expected.month - 1, expected.day);

  let timestamp = targetUtc.getTime();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const localParts = Object.fromEntries(
      parts
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, Number(value)]),
    );
    const representedAsUtc = new Date(0);
    representedAsUtc.setUTCHours(
      localParts.hour,
      localParts.minute,
      localParts.second,
      0,
    );
    representedAsUtc.setUTCFullYear(
      localParts.year,
      localParts.month - 1,
      localParts.day,
    );
    const nextTimestamp = targetUtc.getTime() - (representedAsUtc.getTime() - timestamp);
    if (nextTimestamp === timestamp) break;
    timestamp = nextTimestamp;
  }

  const candidate = new Date(timestamp);
  const parts = formatter.formatToParts(candidate);
  const localParts = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  if (
    localParts.year !== expected.year
    || localParts.month !== expected.month
    || localParts.day !== expected.day
    || localParts.hour !== expected.hour
    || localParts.minute !== expected.minute
    || localParts.second !== expected.second
  ) {
    return null;
  }
  return candidate;
}

export function calculateAvailableSlots({
  date,
  deliveryMethod,
  timeZone,
  weeklyRules,
  exceptions,
  minimumAdvanceMinutes,
  now = new Date(),
}: CalculateAvailableSlotsOptions): string[] {
  const calendarDate = parseDate(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  if (!Number.isInteger(minimumAdvanceMinutes) || minimumAdvanceMinutes < 0) {
    throw new RangeError("minimumAdvanceMinutes must be a non-negative integer");
  }
  if (Number.isNaN(now.getTime())) throw new RangeError("Invalid current date");

  const weekdayDate = new Date(0);
  weekdayDate.setUTCHours(0, 0, 0, 0);
  weekdayDate.setUTCFullYear(
    calendarDate.year,
    calendarDate.month - 1,
    calendarDate.day,
  );
  const weekday = WEEKDAYS[weekdayDate.getUTCDay()];

  const exception = exceptions.find(
    (candidate) =>
      candidate.deliveryMethod === deliveryMethod
      && dateKey(candidate.date) === date,
  );
  if (exception?.isClosed) return [];

  const rule = weeklyRules.find(
    (candidate) =>
      candidate.weekday === weekday
      && candidate.deliveryMethod === deliveryMethod,
  );
  if (!exception && (!rule || !rule.isOpen)) return [];

  const opensAt = exception ? exception.opensAt : rule?.opensAt;
  const closesAt = exception ? exception.closesAt : rule?.closesAt;
  const slotIntervalMinutes = exception
    ? exception.slotIntervalMinutes
    : rule?.slotIntervalMinutes;
  if (opensAt == null || closesAt == null || slotIntervalMinutes == null) {
    throw new RangeError("An open schedule must define its hours and slot interval");
  }
  if (!Number.isInteger(slotIntervalMinutes) || slotIntervalMinutes <= 0) {
    throw new RangeError("slotIntervalMinutes must be a positive integer");
  }

  const start = parseTime(opensAt);
  const end = parseTime(closesAt);
  if (start >= end) return [];

  const cutoff = now.getTime() + minimumAdvanceMinutes * 60_000;
  const slots: string[] = [];
  for (let minute = start; minute < end; minute += slotIntervalMinutes) {
    const instant = localDateTimeAt(calendarDate, minute, formatter);
    if (instant && instant.getTime() >= cutoff) {
      slots.push(
        `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}
