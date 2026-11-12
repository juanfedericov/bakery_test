"use client";

import { useState } from "react";
import ProductCard, { type CatalogProduct, formatPrice } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useCartStore } from "@/lib/useCartStore";

export default function ProductGrid({
  products,
  selectedCategory = null,
}: {
  products: CatalogProduct[];
  selectedCategory?: string | null;
}) {
  const { items, quantities, count, total, addProduct, removeProduct } = useCartStore(products);
  const [announcement, setAnnouncement] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const visibleProducts = selectedCategory === null
    ? products
    : products.filter((product) => product.categoryId === selectedCategory);

  function handleAddProduct(product: CatalogProduct) {
    addProduct(product);
    setAnnouncement(`${product.name} agregado al carrito. Cantidad: ${(quantities[product.id] ?? 0) + 1}.`);
  }

  function handleRemoveProduct(product: CatalogProduct) {
    removeProduct(product);
    setAnnouncement(`${product.name} eliminado del carrito.`);
  }

  return (
    <>
      <details className="cart-summary">
        <summary>Carrito: {count} {count === 1 ? "producto" : "productos"}</summary>
        {items.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <ul>
            {items.map(({ product, quantity, subtotalInCents }) => (
              <li key={product.id}>
                <span>{product.name} × {quantity} — {formatPrice(product.price)} c/u — Subtotal: {formatPrice(subtotalInCents / 100)}</span>
                <button type="button" onClick={() => handleRemoveProduct(product)}>
                  Quitar <span className="sr-only">{product.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p>Total: {formatPrice(total)}</p>
      </details>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <div aria-live="polite" aria-atomic="true">
        {visibleProducts.length === 0 ? (
          <p className="catalog-message">
            {selectedCategory === null
              ? "Todavía no hay productos en el catálogo."
              : "No hay productos en esta categoría."}
          </p>
        ) : (
          <ul className="product-list">
            {visibleProducts.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  onAdd={() => handleAddProduct(product)}
                  onSelect={() => setSelectedProduct(product)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          notes={notes[selectedProduct.id] ?? ""}
          onNotesChange={(value) => setNotes((current) => ({ ...current, [selectedProduct.id]: value }))}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
