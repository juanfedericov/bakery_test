import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import CheckoutForm from "../components/CheckoutForm";
import { useCartStore } from "../lib/store/useCartStore";

test("consulta turnos, valida retiro y envío, y los incluye en el pedido de WhatsApp", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://localhost/checkout",
  });
  const product = {
    id: "rogel", name: "Torta + crema", categoryId: "tortas",
    description: null, ingredients: null, servings: null, imageUrl: null, price: 100.25,
  };
  dom.window.localStorage.setItem("bakery-cart", JSON.stringify({
    state: { items: [{ product, quantity: 2 }], cakeDedication: "Feliz día & más" },
    version: 0,
  }));
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const opened = { opener: {} as object | null };
  const calls: { url: string; target: string }[] = [];
  let blocked = true;
  Object.defineProperty(dom.window, "open", {
    configurable: true,
    value: (url: string, target: string) => {
      calls.push({ url, target });
      return blocked ? null : opened;
    },
  });
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "http://localhost");
    requests.push(url.toString());
    const date = url.searchParams.get("date");
    const deliveryMethod = url.searchParams.get("deliveryMethod");
    const slots = date === "2099-01-05" && deliveryMethod === "delivery"
      ? ["14:30", "15:00"]
      : date === "2099-01-05" && deliveryMethod === "pickup"
        ? ["09:00", "09:30"]
        : [];
    return {
      ok: true,
      json: async () => ({ date, deliveryMethod, slots }),
    } as Response;
  };
  const waitForFetch = () => new Promise((resolve) => setTimeout(resolve, 0));
  const change = async (
    element: HTMLInputElement | HTMLSelectElement,
    value: string,
  ) => {
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(element),
        "value",
      )?.set;
      valueSetter?.call(element, value);
      const eventName = element instanceof dom.window.HTMLInputElement ? "input" : "change";
      element.dispatchEvent(new dom.window.Event(eventName, { bubbles: true }));
      if (eventName === "input") {
        element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      }
      await waitForFetch();
    });
  };

  try {
    await act(async () => root.render(<CheckoutForm whatsappNumber="" />));
    assert.equal(container.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled, true);
    assert.match(container.textContent!, /no está configurado/);
    await act(async () => root.render(<CheckoutForm whatsappNumber="+5491112345678" />));
    assert.equal(container.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled, true);
    assert.match(container.textContent!, /no está configurado/);
    await act(async () => root.render(<CheckoutForm whatsappNumber="5491166778899" />));

    const form = container.querySelector("form")!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!;
    const phone = form.querySelector<HTMLInputElement>('[name="phone"]')!;
    const delivery = form.querySelector<HTMLSelectElement>('[name="deliveryMethod"]')!;
    const date = form.querySelector<HTMLInputElement>('[name="deliveryDate"]')!;
    const slot = form.querySelector<HTMLSelectElement>('[name="deliverySlot"]')!;
    assert.equal(button.disabled, true);
    assert.ok(date.min);
    assert.equal(requests.length, 0);
    assert.equal(form.checkValidity(), false);

    name.value = "   ";
    phone.value = "123456789";
    await change(date, "2099-01-05");
    assert.equal(requests.length, 0);
    await change(delivery, "delivery");
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get("deliveryMethod"), "delivery");
    assert.deepEqual(Array.from(slot.options).slice(1).map((option) => option.value), ["14:30", "15:00"]);
    assert.equal(button.disabled, true);
    await change(slot, "14:30");

    await change(date, "2099-01-06");
    assert.equal(requests.length, 2);
    assert.equal(slot.value, "");
    assert.equal(slot.disabled, true);
    assert.match(form.textContent!, /No hay turnos disponibles para esa fecha y método/);
    assert.equal(button.disabled, true);

    await change(date, "2099-01-05");
    assert.equal(requests.length, 3);
    assert.equal(slot.value, "");
    await change(slot, "14:30");

    const address = form.querySelector<HTMLInputElement>('[name="address"]')!;
    address.value = "   ";
    assert.equal(form.checkValidity(), false);
    await act(async () => button.click());
    assert.equal(calls.length, 0);

    name.value = " Ana & José ";
    assert.equal(form.checkValidity(), false);
    name.value = "   ";
    address.value = " Calle #123 ";
    assert.equal(form.checkValidity(), false);
    name.value = " Ana & José ";
    assert.equal(form.checkValidity(), true);
    assert.match(form.textContent!, /no queda reservado hasta que te lo confirmemos/);
    await act(async () => button.click());
    assert.match(form.textContent!, /No se pudo abrir WhatsApp/);
    assert.equal(useCartStore.getState().items.length, 1);
    assert.equal(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state.items.length, 1);

    blocked = false;
    await act(async () => button.click());
    assert.equal(calls[1].target, "_blank");
    const url = new URL(calls[1].url);
    assert.equal(url.origin + url.pathname, "https://wa.me/5491166778899");
    assert.match(calls[1].url, /%0A/);
    assert.doesNotMatch(calls[1].url, /FÁBRICA/);
    assert.equal(url.searchParams.get("text"), [
      "*NUEVO PEDIDO - FÁBRICA DE TORTAS*",
      "*Cliente:* Ana & José",
      "*Teléfono:* 123456789",
      "*Entrega:* Envío: Calle #123",
      "*Fecha:* 05/01/2099 - 14:30 hs",
      "",
      "*Detalle del Pedido:*",
      "- 2x Torta + crema ($100,25)",
      "",
      "*TOTAL:* $200,50",
    ].join("\n"));
    assert.equal(opened.opener, null);
    assert.deepEqual(useCartStore.getState().items, []);
    assert.equal(useCartStore.getState().cakeDedication, "");
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state, {
      items: [], cakeDedication: "",
    });
    assert.equal(button.disabled, true);
    assert.match(form.textContent!, /Revisá y enviá el mensaje/);
    await act(async () => button.click());
    assert.equal(calls.length, 2);

    await act(async () => {
      useCartStore.getState().addProduct(product);
    });
    await change(delivery, "pickup");
    assert.equal(requests.length, 4);
    assert.equal(new URL(requests[3]).searchParams.get("deliveryMethod"), "pickup");
    assert.equal(slot.value, "");
    assert.equal(form.querySelector('[name="address"]'), null);
    assert.deepEqual(Array.from(slot.options).slice(1).map((option) => option.value), ["09:00", "09:30"]);
    await change(slot, "09:00");
    await act(async () => button.click());
    const pickupMessage = new URL(calls[2].url).searchParams.get("text")!;
    assert.match(pickupMessage, /\*Entrega:\* Retiro en local/);
    assert.match(pickupMessage, /\*Fecha:\* 05\/01\/2099 - 09:00 hs/);
    assert.doesNotMatch(pickupMessage, /Dedicatoria|Calle #123/);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state.items, []);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
