"use client";

import { useState } from "react";
import ProductCard, { type CatalogProduct, formatPrice } from "@/components/ProductCard";

export default function ProductGrid({ products }: { products: CatalogProduct[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState("");
  const selectedProducts = products.filter((product) => quantities[product.id] > 0);
  const count = selectedProducts.reduce((total, product) => total + quantities[product.id], 0);

  function addProduct(product: CatalogProduct) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    setAnnouncement(`${product.name} agregado al carrito. Cantidad: ${(quantities[product.id] ?? 0) + 1}.`);
  }

  function removeProduct(product: CatalogProduct) {
    setQuantities((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
    setAnnouncement(`${product.name} eliminado del carrito.`);
  }

  return (
    <>
      <details className="cart-summary">
        <summary>Carrito: {count} {count === 1 ? "producto" : "productos"}</summary>
        {selectedProducts.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <ul>
            {selectedProducts.map((product) => (
              <li key={product.id}>
                <span>{product.name} × {quantities[product.id]} — {formatPrice(product.price)}</span>
                <button type="button" onClick={() => removeProduct(product)}>
                  Quitar <span className="sr-only">{product.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <ul className="product-list">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} onAdd={() => addProduct(product)} />
          </li>
        ))}
      </ul>
    </>
  );
}
