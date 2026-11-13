"use client";

import { useEffect, useState } from "react";
import ProductCard, { type CatalogProduct } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useCart } from "@/components/CartProvider";
import { useCartStore } from "@/lib/store/useCartStore";

export default function ProductGrid({
  products,
  selectedCategory = null,
}: {
  products: CatalogProduct[];
  selectedCategory?: string | null;
}) {
  const { notify } = useCart();
  const addToCart = useCartStore((state) => state.addProduct);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) void useCartStore.persist.rehydrate();
  }, []);

  const visibleProducts = selectedCategory === null
    ? products
    : products.filter((product) => product.categoryId === selectedCategory);

  function addProduct(product: CatalogProduct) {
    addToCart(product);
    const quantity = useCartStore.getState().items.find((item) => item.product.id === product.id)?.quantity;
    notify(`${product.name} agregado al carrito. Cantidad: ${quantity}.`);
  }

  return (
    <>
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
