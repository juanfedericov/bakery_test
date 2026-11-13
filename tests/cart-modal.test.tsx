import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import CartNav from "../components/CartNav";
import { CartProvider } from "../components/CartProvider";
import { useCartStore } from "../lib/store/useCartStore";

test("abre el carrito guardado, actualiza el subtotal y permite cerrarlo", async () => {
  const product = {
    id: "rogel", name: "Torta Rogel", categoryId: "tortas",
    description: null, ingredients: null, servings: null, imageUrl: null, price: 15000,
  };
  const other = { ...product, id: "tarta", name: "Tarta", price: 100.25 };
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
  dom.window.localStorage.setItem("bakery-cart", JSON.stringify({
    state: { items: [{ product, quantity: 2 }, { product: other, quantity: 1 }] },
    version: 0,
  }));
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new dom.window.Event("close"));
  };
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const click = async (selector: string) => {
    const element = container.querySelector<HTMLElement>(selector);
    assert.ok(element, `No se encontró ${selector}`);
    await act(async () => element.click());
  };

  try {
    await act(async () => root.render(<CartProvider><CartNav /></CartProvider>));
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 3 productos");
    await click(".header-cart");
    assert.ok(container.querySelector("dialog[open]"));
    assert.match(container.querySelector(".cart-drawer-items")!.textContent!, /Torta Rogel.*15\.000.*Cantidad: 2/);
    assert.match(container.querySelector(".cart-drawer-items")!.textContent!, /Tarta.*100,25.*Cantidad: 1/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$30\.100,25/);
    assert.equal(container.querySelector(".cart-checkout")?.getAttribute("href"), "/checkout");

    await act(async () => useCartStore.getState().addProduct(product));
    assert.match(container.querySelector(".cart-drawer-items")!.textContent!, /Torta Rogel.*Cantidad: 3/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$45\.100,25/);
    await click(".cart-remove");
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$100,25/);
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 1 producto");
    await click(".cart-remove");
    assert.match(container.querySelector(".cart-empty")!.textContent!, /carrito está vacío/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$0/);
    assert.equal(container.querySelector(".cart-checkout"), null);

    await click('button[aria-label="Cerrar carrito"]');
    assert.equal(container.querySelector("dialog"), null);
    await click(".header-cart");
    await act(async () => {
      container.querySelector("dialog")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(container.querySelector("dialog"), null);
    await click(".header-cart");
    await click("dialog");
    assert.equal(container.querySelector("dialog"), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
