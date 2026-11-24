import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import ScheduleManager from "../components/admin/ScheduleManager";

type RequestRecord = { url: string; init?: RequestInit };
type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

const emptySchedules = { weeklyRules: [], exceptions: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function mockFetch(handler: FetchHandler, requests: RequestRecord[]) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({ url, init });
    return handler(url, init);
  };
}

function setValue(dom: JSDOM, element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof dom.window.HTMLSelectElement
    ? dom.window.HTMLSelectElement.prototype
    : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function mountManager(fetchImplementation: typeof fetch) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/admin",
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  await act(async () => {
    root.render(<ScheduleManager />);
    await settle();
  });

  return {
    dom,
    container,
    async click(element: HTMLElement) {
      await act(async () => {
        element.click();
        await settle();
      });
    },
    async unmount() {
      await act(async () => root.unmount());
      dom.window.close();
      globalThis.fetch = originalFetch;
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

async function signIn(
  dom: JSDOM,
  container: HTMLElement,
  click: (element: HTMLElement) => Promise<void>,
) {
  const password = container.querySelector<HTMLInputElement>("#admin-password")!;
  await act(async () => {
    setValue(dom, password, "owner-password");
  });
  await click(container.querySelector<HTMLButtonElement>('button[type="submit"]')!);
}

test("muestra solo el acceso sin sesión y comunica credenciales rechazadas", async () => {
  const requests: RequestRecord[] = [];
  const harness = await mountManager(mockFetch((url, init) => {
    if (url === "/api/admin/session" && !init?.method) {
      return jsonResponse({ error: "La sesión administrativa no es válida." }, 401);
    }
    if (url === "/api/admin/session" && init?.method === "POST") {
      return jsonResponse({ error: "Las credenciales no son válidas." }, 401);
    }
    throw new Error(`Unexpected request: ${url} ${init?.method}`);
  }, requests));

  try {
    assert.ok(harness.container.querySelector("#admin-password"));
    assert.equal(harness.container.querySelector("#weekly-title"), null);
    assert.equal(harness.container.querySelector("#exceptions-title"), null);
    await signIn(harness.dom, harness.container, harness.click);
    assert.match(harness.container.querySelector('[role="alert"]')!.textContent!, /credenciales no son válidas/i);
    assert.equal(harness.container.querySelector("#weekly-title"), null);
    assert.equal(requests.length, 2);
  } finally {
    await harness.unmount();
  }
});

test("permite guardar una regla semanal con confirmación", async () => {
  const requests: RequestRecord[] = [];
  const savedRule = {
    weekday: "MONDAY",
    deliveryMethod: "pickup",
    isOpen: true,
    opensAt: "09:00",
    closesAt: "17:00",
    slotIntervalMinutes: 45,
  };
  const harness = await mountManager(mockFetch((url, init) => {
    if (url === "/api/admin/session" && !init?.method) {
      return jsonResponse({ error: "La sesión administrativa no es válida." }, 401);
    }
    if (url === "/api/admin/session" && init?.method === "POST") {
      return jsonResponse({ authenticated: true });
    }
    if (url === "/api/admin/schedules" && !init?.method) {
      return jsonResponse(emptySchedules);
    }
    if (url === "/api/admin/schedules" && init?.method === "PUT") {
      return jsonResponse({ weeklyRules: [savedRule], exceptions: [] });
    }
    throw new Error(`Unexpected request: ${url} ${init?.method}`);
  }, requests));

  try {
    await signIn(harness.dom, harness.container, harness.click);
    assert.equal(harness.container.querySelectorAll("form[aria-label]").length, 14);
    const form = harness.container.querySelector<HTMLFormElement>('form[aria-label="Lunes · Retiro en local"]')!;
    const open = form.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await harness.click(open);
    const interval = form.querySelector<HTMLInputElement>('input[type="number"]')!;
    await act(async () => setValue(harness.dom, interval, "45"));
    await harness.click(form.querySelector<HTMLButtonElement>('button[type="submit"]')!);

    const saveRequest = requests.find((request) => request.init?.method === "PUT");
    assert.ok(saveRequest);
    assert.deepEqual(JSON.parse(String(saveRequest.init?.body)), { weeklyRules: [savedRule] });
    assert.match(harness.container.querySelector('[role="status"]')!.textContent!, /horario de lunes.*guardado/i);
  } finally {
    await harness.unmount();
  }
});

test("agrega y guarda una excepción de horario especial", async () => {
  const requests: RequestRecord[] = [];
  const savedException = {
    date: "2026-12-24",
    deliveryMethod: "delivery",
    isClosed: false,
    opensAt: "10:00",
    closesAt: "15:00",
    slotIntervalMinutes: 60,
  };
  const savedClosure = {
    date: "2026-12-25",
    deliveryMethod: "pickup",
    isClosed: true,
    opensAt: null,
    closesAt: null,
    slotIntervalMinutes: null,
  };
  let saveCount = 0;
  const harness = await mountManager(mockFetch((url, init) => {
    if (url === "/api/admin/session" && !init?.method) {
      return jsonResponse({ error: "La sesión administrativa no es válida." }, 401);
    }
    if (url === "/api/admin/session" && init?.method === "POST") {
      return jsonResponse({ authenticated: true });
    }
    if (url === "/api/admin/schedules" && !init?.method) {
      return jsonResponse(emptySchedules);
    }
    if (url === "/api/admin/schedules" && init?.method === "PUT") {
      saveCount += 1;
      return jsonResponse({ weeklyRules: [], exceptions: [saveCount === 1 ? savedException : savedClosure] });
    }
    throw new Error(`Unexpected request: ${url} ${init?.method}`);
  }, requests));

  try {
    await signIn(harness.dom, harness.container, harness.click);
    await act(async () => {
      setValue(harness.dom, harness.container.querySelector<HTMLInputElement>("#exception-date")!, "2026-12-24");
      setValue(harness.dom, harness.container.querySelector<HTMLSelectElement>("#exception-method")!, "delivery");
      setValue(harness.dom, harness.container.querySelector<HTMLSelectElement>("#exception-type")!, "special");
      setValue(harness.dom, harness.container.querySelector<HTMLInputElement>("#exception-opens")!, "10:00");
      setValue(harness.dom, harness.container.querySelector<HTMLInputElement>("#exception-closes")!, "15:00");
      setValue(harness.dom, harness.container.querySelector<HTMLInputElement>("#exception-interval")!, "60");
    });
    const addForm = harness.container.querySelector<HTMLFormElement>("form:not([aria-label])")!;
    await harness.click(addForm.querySelector<HTMLButtonElement>('button[type="submit"]')!);

    const saveRequest = requests.find((request) => request.init?.method === "PUT");
    assert.ok(saveRequest);
    assert.deepEqual(JSON.parse(String(saveRequest.init?.body)), { exceptions: [savedException] });
    assert.match(harness.container.textContent!, /2026-12-24 · Envío/);
    assert.match(harness.container.querySelector('[role="status"]')!.textContent!, /agregada y guardada/i);

    await act(async () => {
      setValue(harness.dom, harness.container.querySelector<HTMLInputElement>("#exception-date")!, "2026-12-25");
      setValue(harness.dom, harness.container.querySelector<HTMLSelectElement>("#exception-method")!, "pickup");
      setValue(harness.dom, harness.container.querySelector<HTMLSelectElement>("#exception-type")!, "closed");
    });
    await harness.click(addForm.querySelector<HTMLButtonElement>('button[type="submit"]')!);
    const closureRequest = requests.filter((request) => request.init?.method === "PUT")[1];
    assert.ok(closureRequest);
    assert.deepEqual(JSON.parse(String(closureRequest.init?.body)), {
      exceptions: [{ date: "2026-12-25", deliveryMethod: "pickup", isClosed: true }],
    });
    assert.match(harness.container.textContent!, /2026-12-25 · Retiro en local/);
  } finally {
    await harness.unmount();
  }
});

test("permite editar una excepción existente", async () => {
  const requests: RequestRecord[] = [];
  const openException = {
    date: "2026-12-25",
    deliveryMethod: "pickup",
    isClosed: false,
    opensAt: "09:00",
    closesAt: "17:00",
    slotIntervalMinutes: 30,
  };
  const harness = await mountManager(mockFetch((url, init) => {
    if (url === "/api/admin/session" && !init?.method) {
      return jsonResponse({ error: "La sesión administrativa no es válida." }, 401);
    }
    if (url === "/api/admin/session" && init?.method === "POST") {
      return jsonResponse({ authenticated: true });
    }
    if (url === "/api/admin/schedules" && !init?.method) {
      return jsonResponse({
        weeklyRules: [],
        exceptions: [{
          date: "2026-12-25",
          deliveryMethod: "pickup",
          isClosed: true,
          opensAt: null,
          closesAt: null,
          slotIntervalMinutes: null,
        }],
      });
    }
    if (url === "/api/admin/schedules" && init?.method === "PUT") {
      return jsonResponse({ weeklyRules: [], exceptions: [openException] });
    }
    throw new Error(`Unexpected request: ${url} ${init?.method}`);
  }, requests));

  try {
    await signIn(harness.dom, harness.container, harness.click);
    const form = harness.container.querySelector<HTMLFormElement>('form[aria-label="Excepción 2026-12-25 · Retiro en local"]')!;
    const type = form.querySelector<HTMLSelectElement>("select")!;
    await act(async () => setValue(harness.dom, type, "special"));
    await harness.click(form.querySelector<HTMLButtonElement>('button[type="submit"]')!);

    const saveRequest = requests.find((request) => request.init?.method === "PUT");
    assert.ok(saveRequest);
    assert.deepEqual(JSON.parse(String(saveRequest.init?.body)), { exceptions: [openException] });
    assert.match(harness.container.querySelector('[role="status"]')!.textContent!, /excepción del 2026-12-25.*guardada/i);
  } finally {
    await harness.unmount();
  }
});

test("muestra errores al cargar horarios después de autenticar", async () => {
  const requests: RequestRecord[] = [];
  const harness = await mountManager(mockFetch((url, init) => {
    if (url === "/api/admin/session" && !init?.method) {
      return jsonResponse({ error: "La sesión administrativa no es válida." }, 401);
    }
    if (url === "/api/admin/session" && init?.method === "POST") {
      return jsonResponse({ authenticated: true });
    }
    if (url === "/api/admin/schedules") {
      return jsonResponse({ error: "No se pudieron consultar los horarios. Intentá nuevamente." }, 500);
    }
    throw new Error(`Unexpected request: ${url} ${init?.method}`);
  }, requests));

  try {
    await signIn(harness.dom, harness.container, harness.click);
    assert.match(harness.container.querySelector('[role="alert"]')!.textContent!, /no se pudieron consultar los horarios/i);
    assert.ok(harness.container.querySelector("#admin-password"));
    assert.equal(harness.container.querySelector("#weekly-title"), null);
  } finally {
    await harness.unmount();
  }
});
