import { ScheduleDeliveryMethod, type Weekday } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableSlots,
  type ScheduleDeliveryMethod as DeliveryMethod,
} from "@/src/lib/schedule-availability";

const timeZone = "America/Argentina/Buenos_Aires";
const weekdays: readonly Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isDeliveryMethod(value: string): value is DeliveryMethod {
  return value === "pickup" || value === "delivery";
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const dates = searchParams.getAll("date");
  const deliveryMethods = searchParams.getAll("deliveryMethod");
  const date = dates[0];
  const deliveryMethod = deliveryMethods[0];

  if (dates.length !== 1 || !date || !isValidDate(date)
    || deliveryMethods.length !== 1 || !deliveryMethod || !isDeliveryMethod(deliveryMethod)) {
    return jsonResponse({
      error: "La fecha o el método de entrega no son válidos.",
    }, 400);
  }

  const dateValue = new Date(`${date}T00:00:00.000Z`);
  const weekday = weekdays[dateValue.getUTCDay()];
  const databaseDeliveryMethod = deliveryMethod === "pickup"
    ? ScheduleDeliveryMethod.PICKUP
    : ScheduleDeliveryMethod.DELIVERY;

  try {
    const [weeklyRule, exception] = await Promise.all([
      prisma.weeklyScheduleRule.findUnique({
        where: { weekday_deliveryMethod: { weekday, deliveryMethod: databaseDeliveryMethod } },
      }),
      prisma.scheduleException.findUnique({
        where: {
          date_deliveryMethod: {
            date: dateValue,
            deliveryMethod: databaseDeliveryMethod,
          },
        },
      }),
    ]);

    const weeklyRules = weeklyRule ? [{
      weekday: weeklyRule.weekday,
      deliveryMethod,
      isOpen: weeklyRule.isOpen,
      opensAt: weeklyRule.opensAt,
      closesAt: weeklyRule.closesAt,
      slotIntervalMinutes: weeklyRule.slotIntervalMinutes,
    }] : [];
    const exceptions = exception ? [{
      date: exception.date,
      deliveryMethod,
      isClosed: exception.isClosed,
      opensAt: exception.opensAt,
      closesAt: exception.closesAt,
      slotIntervalMinutes: exception.slotIntervalMinutes,
    }] : [];
    const slots = calculateAvailableSlots({
      date,
      deliveryMethod,
      timeZone,
      weeklyRules,
      exceptions,
      minimumAdvanceMinutes: 0,
    });

    return jsonResponse({ date, deliveryMethod, slots });
  } catch (error) {
    console.error("No se pudieron consultar los turnos disponibles:", error);
    return jsonResponse({
      error: "No se pudieron consultar los turnos disponibles. Intentá nuevamente.",
    }, 500);
  }
}
