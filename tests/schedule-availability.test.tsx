import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAvailableSlots,
  type ScheduleException,
  type WeeklyScheduleRule,
} from "../src/lib/schedule-availability";

const mondayPickup: WeeklyScheduleRule = {
  weekday: "MONDAY",
  deliveryMethod: "pickup",
  isOpen: true,
  opensAt: "09:00",
  closesAt: "11:00",
  slotIntervalMinutes: 30,
};

function calculate(
  overrides: Partial<Parameters<typeof calculateAvailableSlots>[0]> = {},
) {
  return calculateAvailableSlots({
    date: "2026-01-05",
    deliveryMethod: "pickup",
    timeZone: "America/Argentina/Buenos_Aires",
    weeklyRules: [mondayPickup],
    exceptions: [],
    minimumAdvanceMinutes: 0,
    now: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

test("genera turnos desde la apertura, respetando intervalo y cierre", () => {
  assert.deepEqual(calculate(), ["09:00", "09:30", "10:00", "10:30"]);
});

test("una excepción abierta reemplaza horario e intervalo semanales", () => {
  const exception: ScheduleException = {
    date: "2026-01-05",
    deliveryMethod: "pickup",
    isClosed: false,
    opensAt: "10:00",
    closesAt: "11:00",
    slotIntervalMinutes: 20,
  };
  assert.deepEqual(calculate({ exceptions: [exception] }), ["10:00", "10:20", "10:40"]);
});

test("una excepción cerrada no genera turnos", () => {
  const exception: ScheduleException = {
    date: "2026-01-05",
    deliveryMethod: "pickup",
    isClosed: true,
  };
  assert.deepEqual(calculate({ exceptions: [exception] }), []);
});

test("un día semanal cerrado no genera turnos", () => {
  assert.deepEqual(calculate({
    weeklyRules: [{ ...mondayPickup, isOpen: false }],
  }), []);
});

test("calcula la anticipación en la zona horaria configurada", () => {
  assert.deepEqual(calculate({
    now: new Date("2026-01-05T11:30:00.000Z"),
    minimumAdvanceMinutes: 60,
  }), ["09:30", "10:00", "10:30"]);
});

test("omite horas locales inexistentes durante el cambio horario", () => {
  const rule: WeeklyScheduleRule = {
    weekday: "SUNDAY",
    deliveryMethod: "delivery",
    isOpen: true,
    opensAt: "01:30",
    closesAt: "04:00",
    slotIntervalMinutes: 30,
  };
  assert.deepEqual(calculateAvailableSlots({
    date: "2026-03-08",
    deliveryMethod: "delivery",
    timeZone: "America/New_York",
    weeklyRules: [rule],
    exceptions: [],
    minimumAdvanceMinutes: 0,
    now: new Date("2026-03-01T00:00:00.000Z"),
  }), ["01:30", "03:00", "03:30"]);
});
