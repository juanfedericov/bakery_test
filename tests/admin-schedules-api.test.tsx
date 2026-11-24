import assert from "node:assert/strict";
import test from "node:test";
import { ScheduleDeliveryMethod, type Prisma, type Weekday } from "@prisma/client";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "../lib/admin-auth";
import { GET, PUT } from "../app/api/admin/schedules/route";
import { prisma } from "../lib/prisma";

const secret = "schedule-test-secret";
const weeklyRule = {
  weekday: "MONDAY" as Weekday,
  deliveryMethod: "pickup" as const,
  isOpen: true,
  opensAt: "09:00",
  closesAt: "17:00",
  slotIntervalMinutes: 30,
};
const openException = {
  date: "2026-12-24",
  deliveryMethod: "delivery" as const,
  isClosed: false,
  opensAt: "10:00",
  closesAt: "15:00",
  slotIntervalMinutes: 60,
};
const closedException = {
  date: "2026-12-25",
  deliveryMethod: "pickup" as const,
  isClosed: true,
};

function setEnvironment(name: string, value: string | undefined): () => void {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return () => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

function request(body?: unknown, token = createAdminSession(secret)!) {
  return new Request("http://localhost/api/admin/schedules", {
    ...(body === undefined ? {} : {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Cookie: `${ADMIN_SESSION_COOKIE}=${token}` } : {}),
    },
  });
}

function scheduleRows() {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    weekly: {
      id: "weekly-1",
      ...weeklyRule,
      deliveryMethod: ScheduleDeliveryMethod.PICKUP,
      opensAt: new Date("1970-01-01T09:00:00.000Z"),
      closesAt: new Date("1970-01-01T17:00:00.000Z"),
      createdAt: now,
      updatedAt: now,
    },
    exception: {
      id: "exception-1",
      date: new Date("2026-12-24T00:00:00.000Z"),
      deliveryMethod: ScheduleDeliveryMethod.DELIVERY,
      isClosed: false,
      opensAt: new Date("1970-01-01T10:00:00.000Z"),
      closesAt: new Date("1970-01-01T15:00:00.000Z"),
      slotIntervalMinutes: 60,
      createdAt: now,
      updatedAt: now,
    },
  };
}

test("requiere una sesión válida para consultar y modificar los horarios", async (t) => {
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", secret);
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "configured");
  t.after(() => {
    restoreSecret();
    restorePassword();
  });

  for (const response of [
    await GET(request(undefined, "")),
    await PUT(request({ weeklyRules: [weeklyRule] }, "")),
  ]) {
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /sesión administrativa/i);
  }
  assert.equal((await PUT(request({ weeklyRules: [weeklyRule] }, "invalid-token"))).status, 401);
});

test("consulta las reglas semanales y excepciones con sesión válida", async (t) => {
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", secret);
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "configured");
  const originalWeeklyFindMany = prisma.weeklyScheduleRule.findMany;
  const originalExceptionFindMany = prisma.scheduleException.findMany;
  t.after(() => {
    restoreSecret();
    restorePassword();
    Object.defineProperty(prisma.weeklyScheduleRule, "findMany", { value: originalWeeklyFindMany, configurable: true, writable: true });
    Object.defineProperty(prisma.scheduleException, "findMany", { value: originalExceptionFindMany, configurable: true, writable: true });
  });
  const rows = scheduleRows();
  Object.defineProperty(prisma.weeklyScheduleRule, "findMany", { configurable: true, writable: true, value: async () => [rows.weekly] });
  Object.defineProperty(prisma.scheduleException, "findMany", { configurable: true, writable: true, value: async () => [rows.exception] });

  const response = await GET(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.weeklyRules[0].opensAt, "09:00");
  assert.equal(body.weeklyRules[0].deliveryMethod, "pickup");
  assert.equal(body.exceptions[0].date, "2026-12-24");
  assert.equal(body.exceptions[0].closesAt, "15:00");
});

test("valida las claves, días, métodos, fechas, horas e intervalos antes de escribir", async (t) => {
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", secret);
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "configured");
  const originalTransaction = prisma.$transaction;
  t.after(() => {
    restoreSecret();
    restorePassword();
    Object.defineProperty(prisma, "$transaction", { value: originalTransaction, configurable: true, writable: true });
  });
  let transactionCount = 0;
  Object.defineProperty(prisma, "$transaction", { configurable: true, writable: true, value: async () => {
    transactionCount++;
    return { weeklyRules: [], exceptions: [] };
  } });

  const invalidBodies = [
    { weeklyRules: [{ ...weeklyRule, weekday: "FUNDAY" }] },
    { weeklyRules: [{ ...weeklyRule, deliveryMethod: "courier" }] },
    { weeklyRules: [{ ...weeklyRule, opensAt: "24:00" }] },
    { weeklyRules: [{ ...weeklyRule, closesAt: "08:59" }] },
    { weeklyRules: [{ ...weeklyRule, slotIntervalMinutes: 0 }] },
    { weeklyRules: [{ ...weeklyRule, slotIntervalMinutes: 1.5 }] },
    { weeklyRules: [{ ...weeklyRule, slotIntervalMinutes: 2_147_483_648 }] },
    { weeklyRules: [weeklyRule, weeklyRule] },
    { exceptions: [{ ...openException, date: "2026-02-29" }] },
    { exceptions: [{ ...openException, date: "0000-01-01" }] },
    { exceptions: [{ ...openException, opensAt: "9:00" }] },
    { exceptions: [{ ...openException, slotIntervalMinutes: -1 }] },
    { exceptions: [{ ...closedException, opensAt: "09:00" }] },
    { exceptions: [openException, openException] },
    {},
  ];
  for (const body of invalidBodies) {
    const response = await PUT(request(body));
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.match((await response.json()).error, /no son válidos/i);
  }
  assert.equal(transactionCount, 0);
});

test("actualiza reglas y excepciones mediante upsert parcial y conserva campos de horario", async (t) => {
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", secret);
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "configured");
  const originalTransaction = prisma.$transaction;
  const originalWeeklyUpsert = prisma.weeklyScheduleRule.upsert;
  const originalExceptionUpsert = prisma.scheduleException.upsert;
  t.after(() => {
    restoreSecret();
    restorePassword();
    Object.defineProperty(prisma, "$transaction", { value: originalTransaction, configurable: true, writable: true });
    Object.defineProperty(prisma.weeklyScheduleRule, "upsert", { value: originalWeeklyUpsert, configurable: true, writable: true });
    Object.defineProperty(prisma.scheduleException, "upsert", { value: originalExceptionUpsert, configurable: true, writable: true });
  });
  const rows = scheduleRows();
  const closedExceptionRow = {
    ...rows.exception,
    id: "exception-closed",
    date: new Date("2026-12-25T00:00:00.000Z"),
    deliveryMethod: ScheduleDeliveryMethod.PICKUP,
    isClosed: true,
    opensAt: null,
    closesAt: null,
    slotIntervalMinutes: null,
  };
  let weeklyArgs: Prisma.WeeklyScheduleRuleUpsertArgs | undefined;
  const exceptionArgs: Prisma.ScheduleExceptionUpsertArgs[] = [];
  Object.defineProperty(prisma.weeklyScheduleRule, "upsert", { configurable: true, writable: true, value: async (args: Prisma.WeeklyScheduleRuleUpsertArgs) => {
    weeklyArgs = args;
    return rows.weekly;
  } });
  Object.defineProperty(prisma.scheduleException, "upsert", { configurable: true, writable: true, value: async (args: Prisma.ScheduleExceptionUpsertArgs) => {
    exceptionArgs.push(args);
    return args.create.isClosed ? closedExceptionRow : rows.exception;
  } });
  Object.defineProperty(prisma, "$transaction", { configurable: true, writable: true, value: async (callback: (transaction: Prisma.TransactionClient) => Promise<unknown>) => callback(prisma) });

  const response = await PUT(request({ weeklyRules: [weeklyRule], exceptions: [openException, closedException] }));
  assert.equal(response.status, 200);
  const savedWeeklyArgs = weeklyArgs;
  assert.ok(savedWeeklyArgs);
  const weeklyUniqueWhere = savedWeeklyArgs.where.weekday_deliveryMethod;
  assert.ok(weeklyUniqueWhere);
  assert.equal(weeklyUniqueWhere.weekday, "MONDAY");
  assert.equal(weeklyUniqueWhere.deliveryMethod, ScheduleDeliveryMethod.PICKUP);
  assert.equal(savedWeeklyArgs.create.slotIntervalMinutes, 30);
  const savedWeeklyOpensAt = savedWeeklyArgs.create.opensAt;
  assert.ok(savedWeeklyOpensAt instanceof Date);
  assert.equal(savedWeeklyOpensAt.toISOString(), "1970-01-01T09:00:00.000Z");
  const savedExceptionArgs = exceptionArgs[0];
  assert.ok(savedExceptionArgs);
  const exceptionUniqueWhere = savedExceptionArgs.where.date_deliveryMethod;
  assert.ok(exceptionUniqueWhere);
  assert.ok(exceptionUniqueWhere.date instanceof Date);
  assert.equal(exceptionUniqueWhere.date.toISOString(), "2026-12-24T00:00:00.000Z");
  assert.equal(savedExceptionArgs.create.slotIntervalMinutes, 60);
  assert.equal(exceptionArgs[1].create.isClosed, true);
  assert.equal(exceptionArgs[1].create.opensAt, null);
  assert.equal(exceptionArgs[1].create.closesAt, null);
  assert.equal(exceptionArgs[1].create.slotIntervalMinutes, null);
  const body = await response.json();
  assert.equal(body.weeklyRules[0].opensAt, "09:00");
  assert.equal(body.exceptions[0].date, "2026-12-24");
  assert.equal(body.exceptions[1].date, "2026-12-25");
});

test("informa errores explícitos si falla la lectura o la persistencia", async (t) => {
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", secret);
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "configured");
  const originalTransaction = prisma.$transaction;
  const originalWeeklyFindMany = prisma.weeklyScheduleRule.findMany;
  const originalExceptionFindMany = prisma.scheduleException.findMany;
  t.after(() => {
    restoreSecret();
    restorePassword();
    Object.defineProperty(prisma, "$transaction", { value: originalTransaction, configurable: true, writable: true });
    Object.defineProperty(prisma.weeklyScheduleRule, "findMany", { value: originalWeeklyFindMany, configurable: true, writable: true });
    Object.defineProperty(prisma.scheduleException, "findMany", { value: originalExceptionFindMany, configurable: true, writable: true });
  });
  Object.defineProperty(prisma, "$transaction", { configurable: true, writable: true, value: async () => { throw new Error("database unavailable"); } });
  Object.defineProperty(prisma.weeklyScheduleRule, "findMany", { configurable: true, writable: true, value: async () => { throw new Error("database unavailable"); } });
  Object.defineProperty(prisma.scheduleException, "findMany", { configurable: true, writable: true, value: async () => [] });
  const log = t.mock.method(console, "error", () => {});

  const updateResponse = await PUT(request({ exceptions: [closedException] }));
  assert.equal(updateResponse.status, 500);
  assert.match((await updateResponse.json()).error, /No se pudieron guardar los horarios/);
  const readResponse = await GET(request());
  assert.equal(readResponse.status, 500);
  assert.match((await readResponse.json()).error, /No se pudieron consultar los horarios/);
  assert.equal(log.mock.callCount(), 2);
});
