"use client";

import { useEffect, useState } from "react";
import ProductCard, { type CatalogProduct, formatPrice } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useCartStore } from "@/lib/store/useCartStore";

export default function ProductGrid({
  products,
  selectedCategory = null,
}: {
  products: CatalogProduct[];
  selectedCategory?: string | null;
}) {
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addProduct);
  const removeFromCart = useCartStore((state) => state.removeProduct);
  const [announcement, setAnnouncement] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) void useCartStore.persist.rehydrate();
  }, []);

  const visibleProducts = selectedCategory === null
    ? products
    : products.filter((product) => product.categoryId === selectedCategory);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  function addProduct(product: CatalogProduct) {
    addToCart(product);
    const quantity = useCartStore.getState().items.find((item) => item.product.id === product.id)?.quantity;
    setAnnouncement(`${product.name} agregado al carrito. Cantidad: ${quantity}.`);
  }

  function removeProduct(product: CatalogProduct) {
    removeFromCart(product.id);
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
            {items.map(({ product, quantity }) => (
              <li key={product.id}>
                <span>{product.name} × {quantity} — {formatPrice(product.price)}</span>
                <button type="button" onClick={() => removeProduct(product)}>
                  Quitar <span className="sr-only">{product.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
                  onAdd={() => addProduct(product)}
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
