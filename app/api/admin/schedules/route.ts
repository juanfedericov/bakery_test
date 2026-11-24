import { ScheduleDeliveryMethod, type Weekday } from "@prisma/client";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthConfigured,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const weekdays: ReadonlySet<string> = new Set([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

type DeliveryMethod = "pickup" | "delivery";

type WeeklyRuleInput = {
  weekday: Weekday;
  deliveryMethod: DeliveryMethod;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  slotIntervalMinutes: number;
};

type ExceptionInput = {
  date: string;
  deliveryMethod: DeliveryMethod;
  isClosed: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  slotIntervalMinutes?: number | null;
};

type SchedulesInput = {
  weeklyRules?: WeeklyRuleInput[];
  exceptions?: ExceptionInput[];
};

function getCookie(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length);
}

function authorizationError(request: Request): Response | null {
  if (!isAdminAuthConfigured()) {
    return Response.json({ error: "La autenticación administrativa no está configurada." }, { status: 503 });
  }
  if (!verifyAdminSession(getCookie(request, ADMIN_SESSION_COOKIE))) {
    return Response.json({ error: "La sesión administrativa no es válida." }, { status: 401 });
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDeliveryMethod(value: unknown): value is DeliveryMethod {
  return value === "pickup" || value === "delivery";
}

function isTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return true;
}

function isInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isWeeklyRule(value: unknown): value is WeeklyRuleInput {
  if (!isRecord(value)
    || typeof value.weekday !== "string"
    || !weekdays.has(value.weekday)
    || !isDeliveryMethod(value.deliveryMethod)
    || typeof value.isOpen !== "boolean"
    || !isTime(value.opensAt)
    || !isTime(value.closesAt)
    || value.opensAt >= value.closesAt
    || !isInterval(value.slotIntervalMinutes)) return false;
  return true;
}

function isException(value: unknown): value is ExceptionInput {
  if (!isRecord(value)
    || !isValidDate(value.date)
    || !isDeliveryMethod(value.deliveryMethod)
    || typeof value.isClosed !== "boolean") return false;

  if (value.isClosed) {
    return (value.opensAt === undefined || value.opensAt === null)
      && (value.closesAt === undefined || value.closesAt === null)
      && (value.slotIntervalMinutes === undefined || value.slotIntervalMinutes === null);
  }

  return isTime(value.opensAt)
    && isTime(value.closesAt)
    && value.opensAt < value.closesAt
    && isInterval(value.slotIntervalMinutes);
}

function hasUniqueKeys<T>(values: T[], keyOf: (value: T) => string): boolean {
  const keys = new Set<string>();
  return values.every((value) => {
    const key = keyOf(value);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function isSchedulesInput(value: unknown): value is SchedulesInput {
  if (!isRecord(value)) return false;
  const hasWeeklyRules = Object.hasOwn(value, "weeklyRules");
  const hasExceptions = Object.hasOwn(value, "exceptions");
  if (!hasWeeklyRules && !hasExceptions) return false;

  if (hasWeeklyRules && (!Array.isArray(value.weeklyRules) || !value.weeklyRules.every(isWeeklyRule)
    || !hasUniqueKeys(value.weeklyRules, (rule) => `${rule.weekday}:${rule.deliveryMethod}`))) return false;
  if (hasExceptions && (!Array.isArray(value.exceptions) || !value.exceptions.every(isException)
    || !hasUniqueKeys(value.exceptions, (exception) => `${exception.date}:${exception.deliveryMethod}`))) return false;
  return true;
}

function toTime(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function formatTime(value: Date | null): string | null {
  if (!value) return null;
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function deliveryMethodValue(value: DeliveryMethod): ScheduleDeliveryMethod {
  return value === "pickup" ? ScheduleDeliveryMethod.PICKUP : ScheduleDeliveryMethod.DELIVERY;
}

function serializeWeeklyRule(rule: {
  id: string;
  weekday: Weekday;
  deliveryMethod: ScheduleDeliveryMethod;
  isOpen: boolean;
  opensAt: Date;
  closesAt: Date;
  slotIntervalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...rule,
    deliveryMethod: rule.deliveryMethod === ScheduleDeliveryMethod.PICKUP ? "pickup" : "delivery",
    opensAt: formatTime(rule.opensAt),
    closesAt: formatTime(rule.closesAt),
  };
}

function serializeException(exception: {
  id: string;
  date: Date;
  deliveryMethod: ScheduleDeliveryMethod;
  isClosed: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  slotIntervalMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...exception,
    date: formatDate(exception.date),
    deliveryMethod: exception.deliveryMethod === ScheduleDeliveryMethod.PICKUP ? "pickup" : "delivery",
    opensAt: formatTime(exception.opensAt),
    closesAt: formatTime(exception.closesAt),
  };
}

export async function GET(request: Request) {
  const unauthorized = authorizationError(request);
  if (unauthorized) return unauthorized;

  try {
    const [weeklyRules, exceptions] = await Promise.all([
      prisma.weeklyScheduleRule.findMany({ orderBy: [{ weekday: "asc" }, { deliveryMethod: "asc" }] }),
      prisma.scheduleException.findMany({ orderBy: [{ date: "asc" }, { deliveryMethod: "asc" }] }),
    ]);
    return Response.json({
      weeklyRules: weeklyRules.map(serializeWeeklyRule),
      exceptions: exceptions.map(serializeException),
    });
  } catch (error) {
    console.error("No se pudieron consultar los horarios administrativos:", error);
    return Response.json({ error: "No se pudieron consultar los horarios. Intentá nuevamente." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = authorizationError(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no contiene JSON válido." }, { status: 400 });
  }
  if (!isSchedulesInput(body)) {
    return Response.json({ error: "Los datos de horarios no son válidos." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const weeklyRules = await Promise.all((body.weeklyRules ?? []).map((rule) => {
        const deliveryMethod = deliveryMethodValue(rule.deliveryMethod);
        const data = {
          deliveryMethod,
          isOpen: rule.isOpen,
          opensAt: toTime(rule.opensAt),
          closesAt: toTime(rule.closesAt),
          slotIntervalMinutes: rule.slotIntervalMinutes,
        };
        return transaction.weeklyScheduleRule.upsert({
          where: { weekday_deliveryMethod: { weekday: rule.weekday, deliveryMethod } },
          create: { weekday: rule.weekday, ...data },
          update: data,
        });
      }));
      const exceptions = await Promise.all((body.exceptions ?? []).map((exception) => {
        const deliveryMethod = deliveryMethodValue(exception.deliveryMethod);
        const isClosed = exception.isClosed;
        const opensAt = isClosed ? null : toTime(exception.opensAt!);
        const closesAt = isClosed ? null : toTime(exception.closesAt!);
        const slotIntervalMinutes = isClosed ? null : exception.slotIntervalMinutes!;
        const data = { isClosed, opensAt, closesAt, slotIntervalMinutes };
        return transaction.scheduleException.upsert({
          where: { date_deliveryMethod: { date: new Date(`${exception.date}T00:00:00.000Z`), deliveryMethod } },
          create: {
            date: new Date(`${exception.date}T00:00:00.000Z`),
            deliveryMethod,
            ...data,
          },
          update: data,
        });
      }));
      return { weeklyRules, exceptions };
    });

    return Response.json({
      weeklyRules: result.weeklyRules.map(serializeWeeklyRule),
      exceptions: result.exceptions.map(serializeException),
    });
  } catch (error) {
    console.error("No se pudieron guardar los horarios administrativos:", error);
    return Response.json({ error: "No se pudieron guardar los horarios. Intentá nuevamente." }, { status: 500 });
  }
}
