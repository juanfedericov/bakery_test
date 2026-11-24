"use client";

import { useEffect, useState, type FormEvent } from "react";

const weekdays = [
  { value: "MONDAY", label: "Lunes" },
  { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" },
  { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
] as const;

const deliveryMethods = [
  { value: "pickup", label: "Retiro en local" },
  { value: "delivery", label: "Envío" },
] as const;

type Weekday = (typeof weekdays)[number]["value"];
type DeliveryMethod = (typeof deliveryMethods)[number]["value"];

interface WeeklyRule {
  weekday: Weekday;
  deliveryMethod: DeliveryMethod;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  slotIntervalMinutes: number;
}

interface ScheduleException {
  date: string;
  deliveryMethod: DeliveryMethod;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  slotIntervalMinutes: number | null;
}

interface ScheduleData {
  weeklyRules: WeeklyRule[];
  exceptions: ScheduleException[];
}

type AccessState = "checking" | "anonymous" | "authenticated";

const DEFAULT_WEEKLY_RULE: Omit<WeeklyRule, "weekday" | "deliveryMethod"> = {
  isOpen: false,
  opensAt: "09:00",
  closesAt: "17:00",
  slotIntervalMinutes: 30,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDeliveryMethod(value: unknown): value is DeliveryMethod {
  return value === "pickup" || value === "delivery";
}

function isWeekday(value: unknown): value is Weekday {
  return weekdays.some((weekday) => weekday.value === value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isWeeklyRule(value: unknown): value is WeeklyRule {
  return isRecord(value)
    && isWeekday(value.weekday)
    && isDeliveryMethod(value.deliveryMethod)
    && typeof value.isOpen === "boolean"
    && isTime(value.opensAt)
    && isTime(value.closesAt)
    && typeof value.slotIntervalMinutes === "number"
    && Number.isInteger(value.slotIntervalMinutes)
    && value.slotIntervalMinutes > 0;
}

function isScheduleException(value: unknown): value is ScheduleException {
  return isRecord(value)
    && typeof value.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && isDeliveryMethod(value.deliveryMethod)
    && typeof value.isClosed === "boolean"
    && (value.opensAt === null || isTime(value.opensAt))
    && (value.closesAt === null || isTime(value.closesAt))
    && (value.slotIntervalMinutes === null
      || (typeof value.slotIntervalMinutes === "number"
        && Number.isInteger(value.slotIntervalMinutes)
        && value.slotIntervalMinutes > 0));
}

function isScheduleData(value: unknown): value is ScheduleData {
  return isRecord(value)
    && Array.isArray(value.weeklyRules)
    && value.weeklyRules.every(isWeeklyRule)
    && Array.isArray(value.exceptions)
    && value.exceptions.every(isScheduleException);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") return body.error;
  } catch {
    return fallback;
  }
  return fallback;
}

async function readSchedules(response: Response): Promise<ScheduleData> {
  const body: unknown = await response.json();
  if (!isScheduleData(body)) {
    throw new Error("La respuesta de horarios no tiene un formato válido.");
  }
  return body;
}

function makeWeeklyRules(savedRules: WeeklyRule[]): WeeklyRule[] {
  return weekdays.flatMap((weekday) =>
    deliveryMethods.map((method) => {
      const saved = savedRules.find(
        (rule) => rule.weekday === weekday.value && rule.deliveryMethod === method.value,
      );
      return saved ?? {
        weekday: weekday.value,
        deliveryMethod: method.value,
        ...DEFAULT_WEEKLY_RULE,
      };
    }),
  );
}

function weeklyRuleKey(rule: Pick<WeeklyRule, "weekday" | "deliveryMethod">): string {
  return `${rule.weekday}:${rule.deliveryMethod}`;
}

function exceptionKey(exception: Pick<ScheduleException, "date" | "deliveryMethod">): string {
  return `${exception.date}:${exception.deliveryMethod}`;
}

function methodLabel(method: DeliveryMethod): string {
  return deliveryMethods.find((item) => item.value === method)!.label;
}

function weekdayLabel(value: Weekday): string {
  return weekdays.find((day) => day.value === value)!.label;
}

export default function ScheduleManager() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [password, setPassword] = useState("");
  const [weeklyRules, setWeeklyRules] = useState<WeeklyRule[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionMethod, setExceptionMethod] = useState<DeliveryMethod>("pickup");
  const [exceptionIsClosed, setExceptionIsClosed] = useState(true);
  const [exceptionOpensAt, setExceptionOpensAt] = useState("09:00");
  const [exceptionClosesAt, setExceptionClosesAt] = useState("17:00");
  const [exceptionInterval, setExceptionInterval] = useState("30");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session");
        if (response.status === 401) {
          if (active) setAccess("anonymous");
          return;
        }
        if (!response.ok) {
          throw new Error(await responseError(response, "No se pudo verificar la sesión."));
        }

        const schedulesResponse = await fetch("/api/admin/schedules");
        if (!schedulesResponse.ok) {
          throw new Error(await responseError(schedulesResponse, "No se pudieron cargar los horarios."));
        }
        const schedules = await readSchedules(schedulesResponse);
        if (active) {
          setWeeklyRules(makeWeeklyRules(schedules.weeklyRules));
          setExceptions(schedules.exceptions);
          setAccess("authenticated");
        }
      } catch (caught) {
        if (active) {
          setError(errorText(caught, "No se pudo verificar el acceso administrativo."));
          setAccess("anonymous");
        }
      }
    }

    void checkSession();
    return () => { active = false; };
  }, []);

  async function loadSchedules(): Promise<void> {
    const response = await fetch("/api/admin/schedules");
    if (!response.ok) {
      throw new Error(await responseError(response, "No se pudieron cargar los horarios."));
    }
    const schedules = await readSchedules(response);
    setWeeklyRules(makeWeeklyRules(schedules.weeklyRules));
    setExceptions(schedules.exceptions);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setAccess("checking");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "No se pudo iniciar sesión."));
      }
      await loadSchedules();
      setPassword("");
      setAccess("authenticated");
    } catch (caught) {
      setError(errorText(caught, "No se pudo iniciar sesión."));
      setAccess("anonymous");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await responseError(response, "No se pudo cerrar la sesión."));
      }
      setWeeklyRules([]);
      setExceptions([]);
      setAccess("anonymous");
      setNotice("Sesión cerrada.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cerrar la sesión."));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveWeeklyRule(event: FormEvent<HTMLFormElement>, rule: WeeklyRule) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (rule.opensAt >= rule.closesAt) {
      setError("La hora de cierre debe ser posterior a la hora de apertura.");
      return;
    }

    const key = weeklyRuleKey(rule);
    setSavingKey(key);
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyRules: [rule] }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "No se pudo guardar este horario."));
      }
      const saved = await readSchedules(response);
      const updatedRule = saved.weeklyRules.find((candidate) => weeklyRuleKey(candidate) === key);
      if (!updatedRule) throw new Error("El servidor no devolvió el horario guardado.");
      setWeeklyRules((current) => current.map((candidate) =>
        weeklyRuleKey(candidate) === key ? updatedRule : candidate,
      ));
      setNotice(`Horario de ${weekdayLabel(rule.weekday).toLowerCase()} para ${methodLabel(rule.deliveryMethod).toLowerCase()} guardado.`);
    } catch (caught) {
      setError(errorText(caught, "No se pudo guardar este horario."));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveException(event: FormEvent<HTMLFormElement>, exception: ScheduleException) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!exception.isClosed
      && (!exception.opensAt || !exception.closesAt || exception.opensAt >= exception.closesAt
        || !exception.slotIntervalMinutes)) {
      setError("Ingresá un horario válido: el cierre debe ser posterior a la apertura.");
      return;
    }

    const key = exceptionKey(exception);
    setSavingKey(key);
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exceptions: [exception.isClosed
            ? { date: exception.date, deliveryMethod: exception.deliveryMethod, isClosed: true }
            : exception],
        }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "No se pudo guardar la excepción."));
      }
      const saved = await readSchedules(response);
      const updatedException = saved.exceptions.find((candidate) => exceptionKey(candidate) === key);
      if (!updatedException) throw new Error("El servidor no devolvió la excepción guardada.");
      setExceptions((current) => current.map((candidate) =>
        exceptionKey(candidate) === key ? updatedException : candidate,
      ));
      setNotice(`Excepción del ${exception.date} para ${methodLabel(exception.deliveryMethod).toLowerCase()} guardada.`);
    } catch (caught) {
      setError(errorText(caught, "No se pudo guardar la excepción."));
    } finally {
      setSavingKey(null);
    }
  }

  async function addException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const exception: ScheduleException = exceptionIsClosed
      ? {
        date: exceptionDate,
        deliveryMethod: exceptionMethod,
        isClosed: true,
        opensAt: null,
        closesAt: null,
        slotIntervalMinutes: null,
      }
      : {
        date: exceptionDate,
        deliveryMethod: exceptionMethod,
        isClosed: false,
        opensAt: exceptionOpensAt,
        closesAt: exceptionClosesAt,
        slotIntervalMinutes: Number(exceptionInterval),
      };

    if (!exceptionIsClosed && exceptionOpensAt >= exceptionClosesAt) {
      setError("La hora de cierre debe ser posterior a la hora de apertura.");
      return;
    }
    if (exceptions.some((candidate) => exceptionKey(candidate) === exceptionKey(exception))) {
      setError("Ya existe una excepción para esa fecha y método. Editala en la lista.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exceptions: [exception.isClosed
            ? { date: exception.date, deliveryMethod: exception.deliveryMethod, isClosed: true }
            : exception],
        }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "No se pudo agregar la excepción."));
      }
      const saved = await readSchedules(response);
      const created = saved.exceptions.find(
        (candidate) => exceptionKey(candidate) === exceptionKey(exception),
      );
      if (!created) throw new Error("El servidor no devolvió la excepción guardada.");
      setExceptions((current) => [...current, created].sort((a, b) =>
        exceptionKey(a).localeCompare(exceptionKey(b)),
      ));
      setExceptionDate("");
      setNotice(`Excepción del ${exception.date} agregada y guardada.`);
    } catch (caught) {
      setError(errorText(caught, "No se pudo agregar la excepción."));
    } finally {
      setSubmitting(false);
    }
  }

  function updateWeeklyRule(key: string, updates: Partial<WeeklyRule>) {
    setWeeklyRules((current) => current.map((rule) =>
      weeklyRuleKey(rule) === key ? { ...rule, ...updates } : rule,
    ));
  }

  function updateException(key: string, updates: Partial<ScheduleException>) {
    setExceptions((current) => current.map((exception) =>
      exceptionKey(exception) === key ? { ...exception, ...updates } : exception,
    ));
  }

  if (access === "checking") {
    return (
      <main className="min-h-screen bg-[#fbf7ef] px-4 py-12 text-[#4b3835]">
        <p className="mx-auto max-w-5xl" role="status">Verificando el acceso y cargando horarios…</p>
      </main>
    );
  }

  if (access === "anonymous") {
    return (
      <main className="min-h-screen bg-[#fbf7ef] px-4 py-12 text-[#4b3835]">
        <section className="mx-auto max-w-md border border-[#e7d9cf] bg-[#fffaf5] p-6 sm:p-8" aria-labelledby="admin-title">
          <p className="text-sm font-bold uppercase tracking-widest text-[#a85f69]">Administración</p>
          <h1 id="admin-title" className="mt-3 font-serif text-4xl">Iniciar sesión</h1>
          <p className="mt-3 text-sm leading-6 text-[#75625b]">Ingresá la contraseña administrativa para editar los horarios.</p>
          <form className="mt-6" onSubmit={(event) => void signIn(event)}>
            <label className="block text-sm font-bold" htmlFor="admin-password">Contraseña</label>
            <input
              className="mt-2 min-h-12 w-full border border-[#cdbdb2] bg-white px-3"
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
            {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
            <button className="mt-5 min-h-12 w-full bg-[#a85f69] px-4 font-bold text-white disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-10 text-[#4b3835] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#a85f69]">Administración</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Horarios</h1>
            <p className="mt-3 max-w-2xl leading-7 text-[#75625b]">Configurá la disponibilidad semanal y agregá excepciones para fechas puntuales.</p>
          </div>
          <button className="min-h-11 border border-[#cdbdb2] px-4 font-bold" type="button" onClick={() => void signOut()} disabled={submitting}>
            Cerrar sesión
          </button>
        </header>

        {error && <p className="mt-6 border border-red-300 bg-red-50 p-4 text-red-900" role="alert">{error}</p>}
        {notice && <p className="mt-6 border border-green-300 bg-green-50 p-4 text-green-900" role="status">{notice}</p>}

        <section className="mt-10" aria-labelledby="weekly-title">
          <h2 id="weekly-title" className="font-serif text-3xl">Reglas semanales</h2>
          <p className="mt-2 text-sm leading-6 text-[#75625b]">Los días o métodos sin una regla guardada comienzan cerrados.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {weeklyRules.map((rule) => {
              const key = weeklyRuleKey(rule);
              const day = weekdays.find((item) => item.value === rule.weekday)!;
              const method = deliveryMethods.find((item) => item.value === rule.deliveryMethod)!;
              return (
                <form
                  className="border border-[#e7d9cf] bg-[#fffaf5] p-5"
                  key={key}
                  aria-label={`${day.label} · ${method.label}`}
                  onSubmit={(event) => void saveWeeklyRule(event, rule)}
                >
                  <h3 className="font-serif text-2xl">{day.label} · {method.label}</h3>
                  <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={rule.isOpen}
                      onChange={(event) => updateWeeklyRule(key, { isOpen: event.target.checked })}
                    />
                    Abierto
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold" htmlFor={`opens-${key}`}>Abre</label>
                      <input
                        className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-2"
                        id={`opens-${key}`}
                        type="time"
                        required
                        value={rule.opensAt}
                        onChange={(event) => updateWeeklyRule(key, { opensAt: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold" htmlFor={`closes-${key}`}>Cierra</label>
                      <input
                        className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-2"
                        id={`closes-${key}`}
                        type="time"
                        required
                        value={rule.closesAt}
                        onChange={(event) => updateWeeklyRule(key, { closesAt: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-bold" htmlFor={`interval-${key}`}>Intervalo entre turnos (minutos)</label>
                    <input
                      className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3"
                      id={`interval-${key}`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={rule.slotIntervalMinutes}
                      onChange={(event) => updateWeeklyRule(key, { slotIntervalMinutes: Number(event.target.value) })}
                    />
                  </div>
                  <button className="mt-5 min-h-11 w-full bg-[#a85f69] px-4 font-bold text-white disabled:opacity-60" type="submit" disabled={savingKey !== null}>
                    {savingKey === key ? "Guardando…" : "Guardar horario"}
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="exceptions-title">
          <h2 id="exceptions-title" className="font-serif text-3xl">Excepciones por fecha</h2>
          <p className="mt-2 text-sm leading-6 text-[#75625b]">Agregá un cierre o un horario especial. Las excepciones existentes se pueden editar.</p>
          <form className="mt-5 border border-[#e7d9cf] bg-[#fffaf5] p-5" onSubmit={(event) => void addException(event)}>
            <h3 className="font-serif text-2xl">Agregar excepción</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold" htmlFor="exception-date">Fecha</label>
                <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-date" type="date" required value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold" htmlFor="exception-method">Método</label>
                <select className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-method" value={exceptionMethod} onChange={(event) => {
                  if (isDeliveryMethod(event.target.value)) setExceptionMethod(event.target.value);
                }}>
                  {deliveryMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold" htmlFor="exception-type">Tipo</label>
                <select className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-type" value={exceptionIsClosed ? "closed" : "special"} onChange={(event) => setExceptionIsClosed(event.target.value === "closed")}>
                  <option value="closed">Cierre</option>
                  <option value="special">Horario especial</option>
                </select>
              </div>
              {!exceptionIsClosed && (
                <>
                  <div>
                    <label className="block text-sm font-bold" htmlFor="exception-opens">Abre</label>
                    <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-opens" type="time" required value={exceptionOpensAt} onChange={(event) => setExceptionOpensAt(event.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold" htmlFor="exception-closes">Cierra</label>
                    <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-closes" type="time" required value={exceptionClosesAt} onChange={(event) => setExceptionClosesAt(event.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold" htmlFor="exception-interval">Intervalo entre turnos (minutos)</label>
                    <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id="exception-interval" type="number" min="1" step="1" required value={exceptionInterval} onChange={(event) => setExceptionInterval(event.target.value)} />
                  </div>
                </>
              )}
            </div>
            <button className="mt-5 min-h-11 bg-[#a85f69] px-5 font-bold text-white disabled:opacity-60" type="submit" disabled={submitting || savingKey !== null}>
              {submitting ? "Guardando…" : "Agregar y guardar excepción"}
            </button>
          </form>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {exceptions.map((exception) => {
              const key = exceptionKey(exception);
              return (
                <form className="border border-[#e7d9cf] bg-[#fffaf5] p-5" key={key} aria-label={`Excepción ${exception.date} · ${methodLabel(exception.deliveryMethod)}`} onSubmit={(event) => void saveException(event, exception)}>
                  <h3 className="font-serif text-xl">{exception.date} · {methodLabel(exception.deliveryMethod)}</h3>
                  <div className="mt-4">
                    <label className="block text-sm font-bold" htmlFor={`exception-type-${key}`}>Tipo</label>
                    <select className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id={`exception-type-${key}`} value={exception.isClosed ? "closed" : "special"} onChange={(event) => {
                      const isClosed = event.target.value === "closed";
                      updateException(key, {
                        isClosed,
                        opensAt: isClosed ? null : exception.opensAt ?? "09:00",
                        closesAt: isClosed ? null : exception.closesAt ?? "17:00",
                        slotIntervalMinutes: isClosed ? null : exception.slotIntervalMinutes ?? 30,
                      });
                    }}>
                      <option value="closed">Cierre</option>
                      <option value="special">Horario especial</option>
                    </select>
                  </div>
                  {!exception.isClosed && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold" htmlFor={`exception-opens-${key}`}>Abre</label>
                        <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-2" id={`exception-opens-${key}`} type="time" required value={exception.opensAt ?? ""} onChange={(event) => updateException(key, { opensAt: event.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold" htmlFor={`exception-closes-${key}`}>Cierra</label>
                        <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-2" id={`exception-closes-${key}`} type="time" required value={exception.closesAt ?? ""} onChange={(event) => updateException(key, { closesAt: event.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold" htmlFor={`exception-interval-${key}`}>Intervalo entre turnos (minutos)</label>
                        <input className="mt-2 min-h-11 w-full border border-[#cdbdb2] bg-white px-3" id={`exception-interval-${key}`} type="number" min="1" step="1" required value={exception.slotIntervalMinutes ?? ""} onChange={(event) => updateException(key, { slotIntervalMinutes: Number(event.target.value) })} />
                      </div>
                    </div>
                  )}
                  <button className="mt-5 min-h-11 w-full bg-[#a85f69] px-4 font-bold text-white disabled:opacity-60" type="submit" disabled={savingKey !== null}>
                    {savingKey === key ? "Guardando…" : "Guardar excepción"}
                  </button>
                </form>
              );
            })}
          </div>
          {exceptions.length === 0 && <p className="mt-4 text-sm text-[#75625b]">Todavía no hay excepciones guardadas.</p>}
        </section>
      </div>
    </main>
  );
}
