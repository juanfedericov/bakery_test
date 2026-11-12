import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Catalog from "../components/Catalog";
import { CartButton, CartProvider } from "../components/CartProvider";

test("integra filtros, tarjetas, carrito y detalle con notas independientes", async () => {
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
      <CartProvider><CartButton /><Catalog
        categories={[{ id: "tortas", name: "Tortas" }, { id: "tartas", name: "Tartas" }, { id: "vacia", name: "Vacía" }]}
        products={[product, { ...product, id: "tarta", name: "Tarta", categoryId: "tartas", ingredients: null, servings: null, imageUrl: null, price: 15000.5 }]}
      /></CartProvider>,
    ));

    assert.match(container.textContent!, /\$\s*15\.000/);
    assert.ok(container.querySelector('img[alt="Torta Rogel"]'));
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    assert.ok(container.querySelector('button[aria-label="Abrir carrito: 1 producto"]'));
    assert.equal(container.querySelector("dialog"), null);

    await click('button[aria-label="Ver detalle de Torta Rogel"]');
    assert.ok(container.querySelector("dialog[open]"));
    assert.match(container.textContent!, /Descripción completa de la Torta Rogel/);
    assert.match(container.textContent!, /Harina, dulce de leche y merengue/);
    assert.match(container.textContent!, /Rinde 10 a 12 personas/);
    const textarea = container.querySelector("textarea")!;
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
    assert.ok(container.querySelector('button[aria-label="Abrir carrito: 1 producto"]'));
    await click('button[aria-label="Ver detalle de Tarta"]');
    assert.equal(container.querySelector("textarea")!.value, "");
    assert.match(container.textContent!, /Ingredientes no disponibles/);
    assert.match(container.textContent!, /Porciones no disponibles/);
    await click('button[aria-label="Cerrar detalle"]');
    await filter("Vacía");
    assert.match(container.textContent!, /No hay productos en esta categoría/);
    assert.ok(container.querySelector('button[aria-label="Abrir carrito: 1 producto"]'));
    await filter("Tortas");
    await click('button[aria-label="Ver detalle de Torta Rogel"]');
    assert.equal(container.querySelector("textarea")!.value, "Feliz cumpleaños");
    await click('button[aria-label="Cerrar detalle"]');
    await click('button[aria-label="Abrir carrito: 1 producto"]');
    assert.ok(container.querySelector(".cart-drawer[open]"));
    assert.ok(container.querySelector('.cart-drawer img[alt="Torta Rogel"]'));
    assert.match(container.querySelector(".cart-item-details")!.textContent!, /\$\s*15\.000 por unidad/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*15\.000/);
    assert.ok(container.querySelector<HTMLButtonElement>(".cart-checkout")!.disabled);
    await click('button[aria-label="Aumentar cantidad de Torta Rogel"]');
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*30\.000/);
    assert.ok(container.querySelector('button[aria-label="Abrir carrito: 2 productos"]'));
    await click('button[aria-label="Disminuir cantidad de Torta Rogel"]');
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*15\.000/);
    await act(async () => container.querySelector(".cart-drawer")!.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ));
    assert.equal(container.querySelector(".cart-drawer"), null);
    await click('button[aria-label="Abrir carrito: 1 producto"]');
    await click('button[aria-label="Disminuir cantidad de Torta Rogel"]');
    assert.match(container.querySelector(".cart-drawer")!.textContent!, /Tu carrito está vacío/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*0/);
    await click('button[aria-label="Cerrar carrito"]');
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    await filter("Tartas");
    await click('button[aria-label="Agregar Tarta al carrito"]');
    await click('button[aria-label="Abrir carrito: 3 productos"]');
    assert.equal(container.querySelectorAll(".cart-item").length, 2);
    assert.match(container.querySelector(".cart-drawer")!.textContent!, /Imagen no disponible/);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*45\.000,50/);
    const remove = Array.from(container.querySelectorAll<HTMLButtonElement>(".cart-remove"))
      .find((button) => button.textContent?.includes("Torta Rogel"));
    assert.ok(remove);
    await act(async () => remove.click());
    assert.equal(container.querySelectorAll(".cart-item").length, 1);
    assert.match(container.querySelector(".cart-subtotal")!.textContent!, /\$\s*15\.000,50/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
