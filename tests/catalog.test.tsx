import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Catalog from "../components/Catalog";
import CartNav from "../components/CartNav";
import { CartProvider } from "../components/CartProvider";
import { useCartStore } from "../lib/store/useCartStore";

test("integra filtros, tarjetas, carrito y detalle con notas independientes", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
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
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new dom.window.Event("close"));
  };

  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const click = async (selector: string) => {
    const element = container.querySelector<HTMLButtonElement>(selector);
    assert.ok(element, `No se encontró ${selector}`);
    await act(async () => element.click());
  };
  const product = {
    id: "rogel", name: "Torta Rogel", categoryId: "tortas",
    description: "Descripción completa de la Torta Rogel.",
    ingredients: "Harina, dulce de leche y merengue.",
    servings: "Rinde 10 a 12 personas",
    imageUrl: "/file.svg", price: 15000,
  };

  try {
    await act(async () => root.render(
      <CartProvider>
        <CartNav />
        <Catalog
          categories={[{ id: "tortas", name: "Tortas" }, { id: "tartas", name: "Tartas" }, { id: "vacia", name: "Vacía" }]}
          products={[product, { ...product, id: "tarta", name: "Tarta", categoryId: "tartas", ingredients: null, servings: null, imageUrl: null }]}
        />
      </CartProvider>,
    ));

    assert.match(container.textContent!, /\$\s*15\.000/);
    assert.ok(container.querySelector('img[alt="Torta Rogel"]'));
    const nav = container.querySelector<HTMLButtonElement>(".header-cart")!;
    const toast = container.querySelector<HTMLElement>(".cart-toast-region")!;
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 0 productos");
    assert.equal(nav.getAttribute("aria-haspopup"), "dialog");
    assert.equal(toast.textContent, "");
    const dedication = container.querySelector<HTMLTextAreaElement>("#cake-dedication")!;
    const dedicationValueSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!;
    const message = "¡Feliz Cumpie Mateo! Alergia al maní";
    await act(async () => {
      dedicationValueSetter.call(dedication, message);
      dedication.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    assert.equal(container.querySelector(".cart-order-note")?.textContent?.trim(), `Mensaje para el pastelero${message}`);
    assert.equal(useCartStore.getState().cakeDedication, message);
    assert.equal(JSON.parse(dom.window.localStorage.getItem("bakery-cart")!).state.cakeDedication, message);
    await act(async () => {
      dedicationValueSetter.call(dedication, "");
      dedication.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    assert.equal(container.querySelector(".cart-order-note"), null);
    t.mock.timers.enable({ apis: ["setTimeout"] });
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    assert.match(container.textContent!, /Carrito: 1 producto/);
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 1 producto");
    assert.match(toast.textContent!, /Torta Rogel agregado al carrito. Cantidad: 1/);
    await act(async () => t.mock.timers.tick(3000));
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 2 productos");
    assert.match(toast.textContent!, /Cantidad: 2/);
    await act(async () => t.mock.timers.tick(1000));
    assert.match(toast.textContent!, /Torta Rogel agregado/);
    await act(async () => t.mock.timers.tick(3000));
    assert.equal(toast.textContent, "");
    assert.equal(container.querySelector("dialog"), null);

    await click('button[aria-label="Ver detalle de Torta Rogel"]');
    assert.ok(container.querySelector("dialog[open]"));
    assert.match(container.textContent!, /Descripción completa de la Torta Rogel/);
    assert.match(container.textContent!, /Harina, dulce de leche y merengue/);
    assert.match(container.textContent!, /Rinde 10 a 12 personas/);
    const textarea = container.querySelector<HTMLTextAreaElement>(".product-modal textarea")!;
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!;
    await act(async () => {
      setValue.call(textarea, "Feliz cumpleaños");
      textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await click('button[aria-label="Cerrar detalle"]');
    assert.equal(container.querySelector("dialog"), null);

    const filter = async (name: string) => {
      const button = Array.from(container.querySelectorAll<HTMLButtonElement>(".catalog-filter"))
        .find((element) => element.textContent === name);
      assert.ok(button);
      await act(async () => button.click());
      assert.equal(button.getAttribute("aria-pressed"), "true");
    };
    await filter("Tartas");
    assert.equal(container.querySelector('button[aria-label="Ver detalle de Torta Rogel"]'), null);
    assert.match(container.textContent!, /Carrito: 2 productos/);
    await click('button[aria-label="Agregar Tarta al carrito"]');
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 3 productos");
    assert.match(toast.textContent!, /Tarta agregado al carrito. Cantidad: 1/);
    await click('button[aria-label="Ver detalle de Tarta"]');
    assert.equal(container.querySelector<HTMLTextAreaElement>(".product-modal textarea")!.value, "");
    assert.match(container.textContent!, /Ingredientes no disponibles/);
    assert.match(container.textContent!, /Porciones no disponibles/);
    await click('button[aria-label="Cerrar detalle"]');
    await filter("Vacía");
    assert.match(container.textContent!, /No hay productos en esta categoría/);
    assert.match(container.textContent!, /Carrito: 3 productos/);
    await filter("Tortas");
    await click('button[aria-label="Ver detalle de Torta Rogel"]');
    assert.equal(container.querySelector<HTMLTextAreaElement>(".product-modal textarea")!.value, "Feliz cumpleaños");
    await click('button[aria-label="Cerrar detalle"]');
    await click(".cart-summary button");
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 1 producto");
    await click(".cart-summary button");
    assert.match(container.textContent!, /Carrito: 0 productos/);
    assert.equal(nav.getAttribute("aria-label"), "Carrito: 0 productos");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
