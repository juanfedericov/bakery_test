import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import CheckoutForm from "../components/CheckoutForm";
import { useCartStore } from "../lib/store/useCartStore";

test("valida el checkout, abre WhatsApp con el pedido y vacía el carrito persistido", async () => {
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
    window: browser,
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
  const requests: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  let resolveResponse!: (response: Response) => void;
  globalThis.fetch = (input, init) => {
    requests.push({ input, init });
    return new Promise((resolve) => { resolveResponse = resolve; });
  };

  try {
    await act(async () => root.render(<CheckoutForm whatsappNumber="" />));
    assert.equal(container.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled, true);
    assert.match(container.textContent!, /no está configurado/);
    await act(async () => root.render(<CheckoutForm whatsappNumber="5491112345678" />));
    const form = container.querySelector("form")!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!;
    const phone = form.querySelector<HTMLInputElement>('[name="phone"]')!;
    const delivery = form.querySelector<HTMLSelectElement>('[name="deliveryMethod"]')!;
    const date = form.querySelector<HTMLInputElement>('[name="deliveryDateTime"]')!;
    assert.equal(button.disabled, false);
    assert.equal(form.checkValidity(), false);
    name.value = "   ";
    phone.value = "123456789";
    date.value = "2026-12-20T14:30";
    await act(async () => {
      delivery.value = "delivery";
      delivery.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
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
    await act(async () => button.click());
    assert.match(form.textContent!, /No se pudo abrir WhatsApp/);
    assert.equal(useCartStore.getState().items.length, 1);
    assert.equal(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state.items.length, 1);

    blocked = false;
    await act(async () => button.click());
    assert.equal(calls[1].target, "_blank");
    const url = new URL(calls[1].url);
    assert.equal(url.origin + url.pathname, "https://wa.me/5491112345678");
    assert.equal(url.searchParams.get("text"), [
      "🎂 *NUEVO PEDIDO - FÁBRICA DE TORTAS*",
      "👤 *Cliente:* Ana & José",
      "📞 *Teléfono:* 123456789",
      "📍 *Entrega:* Envío: Calle #123",
      "📅 *Fecha:* 20/12/2026 - 14:30 hs",
      "",
      "📝 *Detalle del Pedido:*",
      "• 2x Torta + crema ($100,25)",
      "",
      "✍️ *Dedicatoria:* \"Feliz día & más\"",
      "💰 *TOTAL:* $200,50",
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
      delivery.value = "pickup";
      delivery.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(form.querySelector('[name="address"]'), null);
    await act(async () => button.click());
    const pickupMessage = new URL(calls[2].url).searchParams.get("text")!;
    assert.match(pickupMessage, /Entrega:\* Retiro en local/);
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
