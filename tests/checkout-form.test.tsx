import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import CheckoutForm from "../components/CheckoutForm";

test("valida los datos obligatorios y requiere dirección solo para envíos", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://localhost/checkout",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);

  try {
    await act(async () => root.render(<CheckoutForm />));
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
    assert.equal(form.querySelector('[name="address"]'), null);
    await act(async () => form.requestSubmit());
    assert.match(form.textContent!, /todavía no se guardan ni se envía el pedido/);

    await act(async () => {
      delivery.value = "delivery";
      delivery.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    const address = form.querySelector<HTMLInputElement>('[name="address"]')!;
    assert.equal(form.checkValidity(), false);
    address.value = "   ";
    assert.equal(form.checkValidity(), false);
    address.value = "Calle 123";
    assert.equal(form.checkValidity(), true);
    assert.doesNotMatch(form.textContent!, /Los datos están completos/);
    await act(async () => form.requestSubmit());
    assert.match(form.textContent!, /Los datos están completos/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
