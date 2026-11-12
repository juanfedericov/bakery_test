"use client";

import { useState } from "react";
import ProductCard, { type CatalogProduct, formatPrice } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useCart } from "@/components/CartProvider";

export default function ProductGrid({
  products,
  selectedCategory = null,
}: {
  products: CatalogProduct[];
  selectedCategory?: string | null;
}) {
  const { quantities, count, addProduct, removeProduct } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const selectedProducts = products.filter((product) => quantities[product.id] > 0);
  const visibleProducts = selectedCategory === null
    ? products
    : products.filter((product) => product.categoryId === selectedCategory);
  function removeFromCart(product: CatalogProduct) {
    removeProduct(product.id);
    setAnnouncement(`${product.name} eliminado del carrito.`);
  }

  return (
    <>
      <details id="carrito" className="cart-summary">
        <summary>Carrito: {count} {count === 1 ? "producto" : "productos"}</summary>
        {selectedProducts.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <ul>
            {selectedProducts.map((product) => (
              <li key={product.id}>
                <span>{product.name} × {quantities[product.id]} — {formatPrice(product.price)}</span>
                <button type="button" onClick={() => removeFromCart(product)}>
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
                  onAdd={() => addProduct(product.id, product.name)}
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
