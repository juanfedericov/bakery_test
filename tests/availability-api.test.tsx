import assert from "node:assert/strict";
import test from "node:test";
import { ScheduleDeliveryMethod, type Prisma, type Weekday } from "@prisma/client";
import { GET } from "../app/api/availability/route";
import { prisma } from "../lib/prisma";

const monday = "2099-01-05";
const tuesday = "2099-01-06";

function request(date: string, deliveryMethod: string) {
  return new Request(
    `http://localhost/api/availability?date=${encodeURIComponent(date)}&deliveryMethod=${encodeURIComponent(deliveryMethod)}`,
  );
}

function weeklyRule(overrides: Partial<Prisma.WeeklyScheduleRuleGetPayload<object>> = {}) {
  const now = new Date("2098-01-01T00:00:00.000Z");
  return {
    id: "weekly-1",
    weekday: "MONDAY" as Weekday,
    deliveryMethod: ScheduleDeliveryMethod.PICKUP,
    isOpen: true,
    opensAt: new Date("1970-01-01T09:00:00.000Z"),
    closesAt: new Date("1970-01-01T11:00:00.000Z"),
    slotIntervalMinutes: 30,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function exception(
  overrides: Partial<Prisma.ScheduleExceptionGetPayload<object>> = {},
): Prisma.ScheduleExceptionGetPayload<object> {
  const now = new Date("2098-01-01T00:00:00.000Z");
  return {
    id: "exception-1",
    date: new Date(`${tuesday}T00:00:00.000Z`),
    deliveryMethod: ScheduleDeliveryMethod.DELIVERY,
    isClosed: false,
    opensAt: new Date("1970-01-01T10:00:00.000Z"),
    closesAt: new Date("1970-01-01T11:00:00.000Z"),
    slotIntervalMinutes: 20,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stubReads(
  t: test.TestContext,
  weekly: (args: Prisma.WeeklyScheduleRuleFindUniqueArgs) => Promise<unknown>,
  special: (args: Prisma.ScheduleExceptionFindUniqueArgs) => Promise<unknown>,
) {
  const originalWeeklyFindUnique = prisma.weeklyScheduleRule.findUnique;
  const originalExceptionFindUnique = prisma.scheduleException.findUnique;
  t.after(() => {
    Object.defineProperty(prisma.weeklyScheduleRule, "findUnique", {
      value: originalWeeklyFindUnique,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(prisma.scheduleException, "findUnique", {
      value: originalExceptionFindUnique,
      configurable: true,
      writable: true,
    });
  });
  Object.defineProperty(prisma.weeklyScheduleRule, "findUnique", {
    configurable: true,
    writable: true,
    value: weekly,
  });
  Object.defineProperty(prisma.scheduleException, "findUnique", {
    configurable: true,
    writable: true,
    value: special,
  });
}

test("devuelve turnos semanales con los datos de fecha y método y sin caché", async (t) => {
  let weeklyArgs: Prisma.WeeklyScheduleRuleFindUniqueArgs | undefined;
  let exceptionArgs: Prisma.ScheduleExceptionFindUniqueArgs | undefined;
  stubReads(
    t,
    async (args) => {
      weeklyArgs = args;
      return weeklyRule();
    },
    async (args) => {
      exceptionArgs = args;
      return null;
    },
  );

  const response = await GET(request(monday, "pickup"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    date: monday,
    deliveryMethod: "pickup",
    slots: ["09:00", "09:30", "10:00", "10:30"],
  });
  assert.deepEqual(weeklyArgs?.where.weekday_deliveryMethod, {
    weekday: "MONDAY",
    deliveryMethod: ScheduleDeliveryMethod.PICKUP,
  });
  assert.deepEqual(exceptionArgs?.where.date_deliveryMethod, {
    date: new Date(`${monday}T00:00:00.000Z`),
    deliveryMethod: ScheduleDeliveryMethod.PICKUP,
  });
});

test("una excepción vigente reemplaza el horario semanal", async (t) => {
  let currentException = exception();
  stubReads(
    t,
    async () => weeklyRule({
      weekday: "TUESDAY",
      deliveryMethod: ScheduleDeliveryMethod.DELIVERY,
    }),
    async () => currentException,
  );

  const response = await GET(request(tuesday, "delivery"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).slots, ["10:00", "10:20", "10:40"]);

  currentException = exception({
    isClosed: true,
    opensAt: null,
    closesAt: null,
    slotIntervalMinutes: null,
  });
  const closedResponse = await GET(request(tuesday, "delivery"));
  assert.equal(closedResponse.status, 200);
  assert.deepEqual((await closedResponse.json()).slots, []);
});

test("rechaza fecha, método y parámetros duplicados antes de consultar la base", async (t) => {
  let queryCount = 0;
  stubReads(t, async () => {
    queryCount += 1;
    return null;
  }, async () => {
    queryCount += 1;
    return null;
  });

  const invalidRequests = [
    request("2099-02-29", "pickup"),
    request(monday, "courier"),
    new Request(`http://localhost/api/availability?date=${monday}&date=${tuesday}&deliveryMethod=pickup`),
  ];
  for (const invalidRequest of invalidRequests) {
    const response = await GET(invalidRequest);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(queryCount, 0);
});

test("informa errores de lectura sin cachear la respuesta", async (t) => {
  stubReads(t, async () => {
    throw new Error("database unavailable");
  }, async () => null);
  const log = t.mock.method(console, "error", () => {});

  const response = await GET(request(monday, "pickup"));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match((await response.json()).error, /No se pudieron consultar los turnos disponibles/);
  assert.equal(log.mock.callCount(), 1);
});

test("consulta disponibilidad sin crear ni modificar horarios", async (t) => {
  let writeCount = 0;
  const originalWeeklyUpsert = prisma.weeklyScheduleRule.upsert;
  const originalExceptionUpsert = prisma.scheduleException.upsert;
  t.after(() => {
    Object.defineProperty(prisma.weeklyScheduleRule, "upsert", {
      value: originalWeeklyUpsert,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(prisma.scheduleException, "upsert", {
      value: originalExceptionUpsert,
      configurable: true,
      writable: true,
    });
  });
  Object.defineProperty(prisma.weeklyScheduleRule, "upsert", {
    configurable: true,
    writable: true,
    value: async () => {
      writeCount += 1;
      return weeklyRule();
    },
  });
  Object.defineProperty(prisma.scheduleException, "upsert", {
    configurable: true,
    writable: true,
    value: async () => {
      writeCount += 1;
      return exception();
    },
  });
  stubReads(t, async () => weeklyRule(), async () => null);

  assert.equal((await GET(request(monday, "pickup"))).status, 200);
  assert.equal(writeCount, 0);
});
