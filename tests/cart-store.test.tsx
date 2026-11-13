import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { renderToString } from "react-dom/server";
import ProductGrid from "../components/ProductGrid";
import CartNav from "../components/CartNav";
import { CartProvider } from "../components/CartProvider";
import { useCartStore } from "../lib/store/useCartStore";

test("recupera y actualiza productos y cantidades guardados sin errores de hidratación", async () => {
  const product = {
    id: "rogel", name: "Torta Rogel", categoryId: "tortas",
    description: null, ingredients: null, servings: null,
    imageUrl: null, price: 15000,
  };
  const other = { ...product, id: "tarta", name: "Tarta", price: 100.25 };
  const html = renderToString(
    <CartProvider><CartNav /><ProductGrid products={[product, other]} /></CartProvider>,
  );
  const dom = new JSDOM(`<!doctype html><html><body><div id="root">${html}</div></body></html>`, {
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
  const { hydrateRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;

  try {
    await act(async () => {
      root = hydrateRoot(container, (
        <CartProvider><CartNav /><ProductGrid products={[product, other]} /></CartProvider>
      ), {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    assert.deepEqual(errors, []);
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 3 productos");
    assert.equal(container.querySelector("dialog"), null);
    await act(async () => container.querySelector<HTMLButtonElement>(".header-cart")!.click());
    assert.match(container.querySelector(".cart-drawer-items")!.textContent!, /Torta Rogel.*Cantidad: 2/);
    assert.match(container.querySelector(".cart-drawer-items")!.textContent!, /Tarta.*Cantidad: 1/);
    assert.equal(container.querySelector<HTMLAnchorElement>(".cart-checkout")?.getAttribute("href"), "/checkout");
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$30\.100,25/);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Agregar Torta Rogel al carrito"]')!.click();
    });
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 4 productos");
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$45\.100,25/);
    const saved = dom.window.localStorage.getItem("bakery-cart")!;
    assert.deepEqual(JSON.parse(saved).state.items, [
      { product, quantity: 3 },
      { product: other, quantity: 1 },
    ]);
    assert.equal(JSON.parse(saved).state.cakeDedication, "");

    await act(async () => {
      useCartStore.setState({ items: [] });
      dom.window.localStorage.setItem("bakery-cart", saved);
      await useCartStore.persist.rehydrate();
    });
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 4 productos");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".cart-remove")!.click();
    });
    assert.equal(container.querySelector(".header-cart")?.getAttribute("aria-label"), "Carrito: 1 producto");
    assert.match(container.querySelector(".cart-subtotal")!.textContent!.replace(/\s/g, ""), /Subtotal\$100,25/);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state.items, [
      { product: other, quantity: 1 },
    ]);
    await act(async () => useCartStore.getState().removeProduct(other.id));
    assert.equal(container.querySelector(".cart-checkout"), null);
  } finally {
    await act(async () => root!.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
