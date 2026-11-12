import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ProductGrid from "../components/ProductGrid";
import { CartButton, CartProvider } from "../components/CartProvider";
import { formatPrice } from "../components/ProductCard";
import { isSupportedProductImage } from "../lib/product-image";
import { CartProvider } from "../components/CartProvider";

test("formatea precios enteros y con centavos en pesos argentinos", () => {
  assert.equal(formatPrice(15000).replace(/\s/g, ""), "$15.000");
  assert.equal(formatPrice(15000.5).replace(/\s/g, ""), "$15.000,50");
});

test("renderiza las tarjetas y el estado inicial del carrito", () => {
  const html = renderToStaticMarkup(
    <CartProvider><ProductGrid products={[
      { id: "1", name: "Torta", description: "De chocolate", price: 15000, imageUrl: "/file.svg", categoryId: "1", ingredients: null, servings: null },
      { id: "2", name: "Tarta", description: null, price: 15000.5, imageUrl: null, categoryId: "2", ingredients: null, servings: null },
    ]} /></CartProvider>,
  );

  assert.match(html, /Abrir carrito: 0 productos/);
  assert.match(html, /<h3>Torta<\/h3>/);
  assert.match(html, /De chocolate/);
  assert.match(html, /alt="Torta"/);
  assert.match(html, /Imagen no disponible/);
  assert.match(html, /Agregar Torta al carrito/);
  assert.match(html, /Agregar Tarta al carrito/);
  assert.match(html, /Ver detalle de Torta/);
});

test("solo admite imágenes locales o de los orígenes configurados", () => {
  assert.equal(isSupportedProductImage("/file.svg"), true);
  assert.equal(isSupportedProductImage("https://images.unsplash.com/photo-123?w=800"), true);
  assert.equal(isSupportedProductImage("//images.unsplash.com/photo-123"), false);
  assert.equal(isSupportedProductImage("https://example.com/photo-123"), false);
  assert.equal(isSupportedProductImage("not a url"), false);
});

test("muestra el estado vacío del catálogo", () => {
  const html = renderToStaticMarkup(<CartProvider><ProductGrid products={[]} /></CartProvider>);
  assert.match(html, /Todavía no hay productos en el catálogo/);
  assert.match(html, /Abrir carrito: 0 productos/);
});
