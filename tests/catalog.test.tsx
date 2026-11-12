import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Catalog from "../components/Catalog";

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
      <Catalog
        categories={[{ id: "tortas", name: "Tortas" }, { id: "tartas", name: "Tartas" }, { id: "vacia", name: "Vacía" }]}
        products={[
          product,
          { ...product, id: "tarta", name: "Tarta", categoryId: "tartas", ingredients: null, servings: null, imageUrl: null },
          { ...product, id: "marquise", name: "Torta Marquise", price: 10000 },
          { ...product, id: "frutilla", name: "Tarta de Frutilla", categoryId: "tartas", price: 8000 },
          { ...product, id: "decimal", name: "Mini Tarta", price: 0.1 },
        ]}
      />,
    ));

    assert.match(container.textContent!, /\$\s*15\.000/);
    assert.ok(container.querySelector('img[alt="Torta Rogel"]'));
    await click('button[aria-label="Agregar Torta Rogel al carrito"]');
    assert.match(container.textContent!, /Carrito: 1 producto/);
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
    assert.match(container.textContent!, /Carrito: 1 producto/);
    await click('button[aria-label="Ver detalle de Tarta"]');
    assert.equal(container.querySelector("textarea")!.value, "");
    assert.match(container.textContent!, /Ingredientes no disponibles/);
    assert.match(container.textContent!, /Porciones no disponibles/);
    await click('button[aria-label="Cerrar detalle"]');
    await filter("Vacía");
    assert.match(container.textContent!, /No hay productos en esta categoría/);
    assert.match(container.textContent!, /Carrito: 1 producto/);
    await filter("Tortas");
    await click('button[aria-label="Ver detalle de Torta Rogel"]');
    assert.equal(container.querySelector("textarea")!.value, "Feliz cumpleaños");
    await click('button[aria-label="Cerrar detalle"]');
    await click(".cart-summary button");
    assert.match(container.textContent!, /Carrito: 0 productos/);
    const cartText = () => container.querySelector(".cart-summary")!.textContent!.replace(/\s/g, "");
    assert.match(cartText(), /Total:\$0/);

    await click('button[aria-label="Agregar Torta Marquise al carrito"]');
    await click('button[aria-label="Agregar Torta Marquise al carrito"]');
    await filter("Tartas");
    await click('button[aria-label="Agregar Tarta de Frutilla al carrito"]');
    assert.match(cartText(), /TortaMarquise×2.*Subtotal:\$20\.000/);
    assert.match(cartText(), /TartadeFrutilla×1.*Subtotal:\$8\.000/);
    assert.match(cartText(), /Total:\$28\.000/);
    await click('.cart-summary button:has(.sr-only)');
    assert.match(cartText(), /Total:\$8\.000/);
    assert.doesNotMatch(cartText(), /TortaMarquise/);
    await click(".cart-summary button");
    assert.match(cartText(), /Total:\$0/);

    await filter("Tortas");
    await click('button[aria-label="Agregar Mini Tarta al carrito"]');
    await click('button[aria-label="Agregar Mini Tarta al carrito"]');
    await click('button[aria-label="Agregar Mini Tarta al carrito"]');
    assert.match(cartText(), /Subtotal:\$0,30/);
    assert.match(cartText(), /Total:\$0,30/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
