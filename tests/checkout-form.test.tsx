import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import CheckoutForm from "../components/CheckoutForm";

test("valida la entrega y espera el guardado exitoso antes de abrir WhatsApp", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://localhost/checkout",
  });
  const product = {
    id: "rogel", name: "Rogel", categoryId: "tortas", description: null,
    ingredients: null, servings: null, imageUrl: null, price: 100.25,
  };
  dom.window.localStorage.setItem("bakery-cart", JSON.stringify({
    state: { items: [{ product, quantity: 2 }], cakeDedication: "Feliz día" }, version: 0,
  }));
  const navigation: string[] = [];
  const browser = Object.create(dom.window);
  Object.defineProperty(browser, "location", { value: { assign: (url: string) => navigation.push(url) } });
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
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!;
    const phone = form.querySelector<HTMLInputElement>('[name="phone"]')!;
    const delivery = form.querySelector<HTMLSelectElement>('[name="deliveryMethod"]')!;
    const date = form.querySelector<HTMLInputElement>('[name="deliveryDateTime"]')!;
    assert.equal(form.checkValidity(), false);
    name.value = "   ";
    phone.value = "123456789";
    date.value = "2026-12-20T14:30";
    await act(async () => {
      delivery.value = "pickup";
      delivery.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(form.checkValidity(), false);
    name.value = "Ana";
    assert.equal(form.checkValidity(), true);
    await act(async () => {
      delivery.value = "delivery";
      delivery.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    const address = form.querySelector<HTMLInputElement>('[name="address"]')!;
    assert.equal(form.checkValidity(), false);
    address.value = "Calle 123";
    assert.equal(form.checkValidity(), true);

    await act(async () => form.requestSubmit());
    assert.equal(requests.length, 1);
    assert.equal(requests[0].input, "/api/orders");
    assert.deepEqual(JSON.parse(String(requests[0].init?.body)), {
      customerName: "Ana", phone: "123456789", deliveryMethod: "delivery",
      address: "Calle 123", deliveryDateTime: "2026-12-20T14:30", dedication: "Feliz día",
      items: [{ productId: "rogel", quantity: 2, unitPrice: 100.25 }],
    });
    assert.deepEqual(navigation, []);
    assert.equal(form.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled, true);

    await act(async () => resolveResponse(Response.json({ error: "No se pudo guardar." }, { status: 500 })));
    assert.deepEqual(navigation, []);
    assert.match(form.textContent!, /No se pudo guardar/);
    await act(async () => form.requestSubmit());
    assert.equal(requests.length, 2);
    await act(async () => resolveResponse(Response.json({
      id: "order-1", items: [{ product: { name: "Rogel", price: 100.25 }, quantity: 2 }],
    }, { status: 201 })));
    assert.equal(navigation.length, 1);
    const url = new URL(navigation[0]);
    assert.equal(url.origin + url.pathname, "https://wa.me/5491112345678");
    assert.match(url.searchParams.get("text")!, /Envío: Calle 123/);
    assert.match(url.searchParams.get("text")!, /20\/12\/2026 - 14:30/);
    assert.match(url.searchParams.get("text")!, /TOTAL:\* \$200,50/);
    await act(async () => form.requestSubmit());
    assert.equal(requests.length, 2);
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
