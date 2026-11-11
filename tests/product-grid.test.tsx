import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ProductGrid from "../components/ProductGrid";
import { formatPrice } from "../components/ProductCard";
import { isSupportedProductImage } from "../lib/product-image";

test("formatea precios enteros y con centavos en pesos argentinos", () => {
  assert.equal(formatPrice(15000).replace(/\s/g, ""), "$15.000");
  assert.equal(formatPrice(15000.5).replace(/\s/g, ""), "$15.000,50");
});

test("renderiza las tarjetas y el estado inicial del carrito", () => {
  const html = renderToStaticMarkup(
    <ProductGrid products={[
      { id: "1", name: "Torta", description: "De chocolate", price: 15000, imageUrl: "/file.svg" },
      { id: "2", name: "Tarta", description: null, price: 15000.5, imageUrl: null },
    ]} />,
  );

  assert.match(html, /Carrito: 0 productos/);
  assert.match(html, /<h3>Torta<\/h3>/);
  assert.match(html, /De chocolate/);
  assert.match(html, /alt="Torta"/);
  assert.match(html, /Imagen no disponible/);
  assert.match(html, /Agregar Torta al carrito/);
  assert.match(html, /Agregar Tarta al carrito/);
});

test("solo admite imágenes locales o de los orígenes configurados", () => {
  assert.equal(isSupportedProductImage("/file.svg"), true);
  assert.equal(isSupportedProductImage("https://images.unsplash.com/photo-123?w=800"), true);
  assert.equal(isSupportedProductImage("//images.unsplash.com/photo-123"), false);
  assert.equal(isSupportedProductImage("https://example.com/photo-123"), false);
  assert.equal(isSupportedProductImage("not a url"), false);
});
